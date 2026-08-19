import { BaseAgent, type AgentTask } from './BaseAgent.js';
import { llm } from '../ai/llm.js';

interface PlanStep { capability: string; input?: (results: StepResult[], original: unknown) => unknown }
interface StepResult { capability: string; output: unknown }

/** Routes goals to specialist agents by capability; runs deterministic or LLM-planned workflows. */
export class Supervisor extends BaseAgent {
  private registry = new Map<string, BaseAgent>();
  readonly agents: BaseAgent[] = [];
  constructor() { super('Supervisor', ['orchestration']); }

  use(agent: BaseAgent): this {
    this.agents.push(agent);
    for (const c of agent.capabilities) this.registry.set(c, agent);
    return this;
  }

  async route(capability: string, task: AgentTask): Promise<any> {
    const agent = this.registry.get(capability);
    if (!agent) throw new Error(`No agent for capability: ${capability}`);
    this.log.info({ capability, to: agent.name }, 'route');
    return agent.handle(task);
  }

  async handle(task: AgentTask & { goal: string }): Promise<{ goal: string; steps: StepResult[] }> {
    const plan = KNOWN_PLANS[task.goal] ?? (await this.plan(task.goal, task.input));
    const results: StepResult[] = [];
    for (const step of plan) {
      const input = step.input ? step.input(results, task.input) : task.input;
      const output = await this.route(step.capability, { ...task, input });
      results.push({ capability: step.capability, output });
    }
    return { goal: task.goal, steps: results };
  }

  private async plan(goal: string, input: unknown): Promise<PlanStep[]> {
    const caps = [...this.registry.keys()].join(', ');
    const raw = await llm.complete({
      system: `Planner. Capabilities: ${caps}. Return ONLY JSON array [{"capability":"..."}]. No prose.`,
      messages: [{ role: 'user', content: `Goal: ${goal}\nContext: ${JSON.stringify(input).slice(0, 400)}` }],
    });
    try {
      return (JSON.parse(raw.replace(/```json|```/g, '').trim()) as { capability: string }[])
        .map((s) => ({ capability: s.capability }));
    } catch { return [{ capability: 'qa' }]; }
  }
}

const KNOWN_PLANS: Record<string, PlanStep[]> = {
  find_and_schedule_tutor: [
    { capability: 'recommend_tutors' },
    {
      capability: 'scheduling',
      input: (results, original) => ({
        ...(original as object),
        teacherAvail: (results[0]?.output as any)?.recommended?.[0]?.tutor?.availability ?? [],
      }),
    },
  ],
  ask_ai_twin: [{ capability: 'ai_twin' }],
};
