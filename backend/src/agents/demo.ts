/** Standalone demo of the multi-agent system. Run: npm run demo */
import { agentSystem } from './index.js';
import { bus } from '../core/eventBus.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  agentSystem.start();
  await bus.publish('teacher.lesson.uploaded', {
    teacherId: 'mensah', source: 'Physics L4',
    text: "Newton's first law: an object stays at rest unless acted on by a net force. We call this inertia.",
  });
  await sleep(50);
  const ans = await agentSystem.supervisor.route('ai_twin', { input: { question: 'What is inertia?', twinId: 'mensah' } });
  console.log('AI Twin:', ans.answer, '\nCitations:', ans.citations);

  const wf = await agentSystem.supervisor.handle({
    goal: 'find_and_schedule_tutor',
    input: {
      student: { subject: 'Physics', language: 'Twi', maxPrice: 120 },
      tutors: [{ id: 'mensah', subjects: ['Physics'], languages: ['Twi'], hourlyRateGHS: 100, rating: 4.8, completedSessions: 320, availability: [{ start: Date.now(), end: Date.now() + 3 * 3600e3 }] }],
      studentAvail: [{ start: Date.now(), end: Date.now() + 2 * 3600e3 }],
      durationMin: 60,
    },
  });
  console.log('Workflow steps:', wf.steps.map((s) => s.capability).join(' → '));
  process.exit(0);
}
main();
