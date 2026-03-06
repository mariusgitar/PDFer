export type ToolMode = 'merge' | 'reorder';

export interface ModeOption {
  id: ToolMode;
  label: string;
  description: string;
}

export const TOOL_MODES: ModeOption[] = [
  {
    id: 'merge',
    label: 'Slå sammen PDF',
    description: 'Kombiner flere PDF-filer i valgfri rekkefølge.'
  },
  {
    id: 'reorder',
    label: 'Organiser sider',
    description: 'Last opp én PDF, flytt sider og slett det du ikke trenger.'
  }
];
