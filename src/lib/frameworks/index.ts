import { FrameworkDefinition, FrameworkPhase } from '@/types';
import { frameworkDefinitions } from './definitions';

export function getAllFrameworks(): Omit<FrameworkDefinition, 'id'>[] {
  return frameworkDefinitions;
}

export function getFrameworkByName(name: string): Omit<FrameworkDefinition, 'id'> | undefined {
  return frameworkDefinitions.find(f => f.name === name);
}

export function getPhaseForRound(
  framework: FrameworkDefinition,
  roundNumber: number
): FrameworkPhase | undefined {
  let cumulativeRounds = 0;
  for (const phase of framework.phases) {
    cumulativeRounds += phase.roundCount;
    if (roundNumber < cumulativeRounds) {
      return phase;
    }
  }
  return framework.phases[framework.phases.length - 1];
}

export function getTotalRounds(framework: FrameworkDefinition): number {
  return framework.phases.reduce((sum, p) => sum + p.roundCount, 0);
}

export function matchFramework(topic: string): string {
  const topicLower = topic.toLowerCase();
  let bestMatch = 'six_thinking_hats';
  let bestScore = 0;

  for (const fw of frameworkDefinitions) {
    let score = 0;
    for (const trigger of fw.triggers) {
      if (topicLower.includes(trigger)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = fw.name;
    }
  }

  return bestMatch;
}
