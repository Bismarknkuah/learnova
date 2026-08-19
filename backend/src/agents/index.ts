import { Supervisor } from './Supervisor.js';
import { TutorAgent } from './TutorAgent.js';
import { RecommendationAgent } from './RecommendationAgent.js';
import { SchedulingAgent } from './SchedulingAgent.js';
import { FinanceAgent } from './FinanceAgent.js';
import { AssessmentAgent } from './AssessmentAgent.js';
import { ClassAssistantAgent } from './ClassAssistantAgent.js';
import { AdaptiveAgent } from './AdaptiveAgent.js';
import { ExamAgent, CareerAgent, FraudAgent, AnalyticsAgent, SchoolAgent, ParentAgent, ResearchAgent } from './specialists.js';
import { logger } from '../core/logger.js';

class AgentSystem {
  supervisor = new Supervisor();
  tutor = new TutorAgent();
  recommendation = new RecommendationAgent();
  scheduling = new SchedulingAgent();
  finance = new FinanceAgent();
  assessment = new AssessmentAgent();
  classAssistant = new ClassAssistantAgent();
  adaptive = new AdaptiveAgent();
  exam = new ExamAgent();
  career = new CareerAgent();
  fraud = new FraudAgent();
  analytics = new AnalyticsAgent();
  school = new SchoolAgent();
  parent = new ParentAgent();
  research = new ResearchAgent();

  start(): this {
    this.supervisor
      .use(this.tutor)
      .use(this.recommendation)
      .use(this.scheduling)
      .use(this.assessment)
      .use(this.adaptive)
      .use(this.exam)
      .use(this.career)
      .use(this.fraud)
      .use(this.analytics)
      .use(this.school)
      .use(this.research);

    [this.tutor, this.recommendation, this.scheduling, this.finance,
     this.assessment, this.classAssistant, this.adaptive,
     this.exam, this.career, this.fraud, this.analytics, this.school, this.parent, this.research].forEach((a) => a.register());

    logger.info({ capabilities: this.supervisor.agents.flatMap((a) => a.capabilities) }, 'agent system online');
    this._online = true;
    return this;
  }

  private _online = false;

  /** Live status of the multi-agent system for admin dashboards / health checks. */
  status() {
    const all = [this.tutor, this.recommendation, this.scheduling, this.finance,
                 this.assessment, this.classAssistant, this.adaptive,
                 this.exam, this.career, this.fraud, this.analytics, this.school, this.parent, this.research];
    return {
      online: this._online,
      supervisor: { name: this.supervisor.name, routes: [...this.supervisor.agents].length },
      agents: all.map((a) => ({ name: a.name, capabilities: a.capabilities })),
      capabilities: all.flatMap((a) => a.capabilities),
    };
  }
}
export const agentSystem = new AgentSystem();
