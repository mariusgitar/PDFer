export interface ChallengeItem {
  id: string;
  label: string;
}

export interface ChallengeState {
  items: ChallengeItem[];
}

export const TARGET_ORDER: string[] = [
  '01_Forside.pdf',
  '02_Innhold.pdf',
  '03_Vedlegg_A.pdf',
  '04_Vedlegg_B.pdf',
  '05_Signatur.pdf'
];

export function createInitialChallengeState(): ChallengeState {
  return {
    items: [
      { id: '03', label: '03_Vedlegg_A.pdf' },
      { id: '01', label: '01_Forside.pdf' },
      { id: '05', label: '05_Signatur.pdf' },
      { id: '02', label: '02_Innhold.pdf' },
      { id: '04', label: '04_Vedlegg_B.pdf' }
    ]
  };
}

export function moveUp(state: ChallengeState, id: string): ChallengeState {
  const index = state.items.findIndex((item) => item.id === id);
  if (index <= 0) {
    return state;
  }

  const items = [...state.items];
  const [item] = items.splice(index, 1);
  items.splice(index - 1, 0, item);
  return { items };
}

export function moveDown(state: ChallengeState, id: string): ChallengeState {
  const index = state.items.findIndex((item) => item.id === id);
  if (index === -1 || index >= state.items.length - 1) {
    return state;
  }

  const items = [...state.items];
  const [item] = items.splice(index, 1);
  items.splice(index + 1, 0, item);
  return { items };
}

export function isSolved(state: ChallengeState): boolean {
  return state.items.map((item) => item.label).join('|') === TARGET_ORDER.join('|');
}
