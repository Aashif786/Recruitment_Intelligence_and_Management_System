import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InterviewSidebar from '@/modules/interview/InterviewSidebar';

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <svg data-testid="icon-check" />,
  Circle: () => <svg data-testid="icon-circle" />,
  HelpCircle: () => <svg data-testid="icon-help" />,
  XCircle: () => <svg data-testid="icon-x" />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const MOCK_QUESTIONS = [
  { question_number: 0, question_type: 'aptitude' },
  { question_number: 1, question_type: 'aptitude' },
  { question_number: 2, question_type: 'technical' },
  { question_number: 3, question_type: 'technical' },
  { question_number: 4, question_type: 'behavioral' },
];

const defaultProps = {
  currentQuestion: 0,
  completedQuestions: [],
  incorrectQuestions: [],
  skippedQuestions: [],
  onSelectQuestion: vi.fn(),
  strikes: 0,
  allQuestions: MOCK_QUESTIONS,
};

describe('InterviewSidebar', () => {
  beforeEach(() => {
    defaultProps.onSelectQuestion.mockClear();
  });

  it('renders the Security Monitor section', () => {
    render(<InterviewSidebar {...defaultProps} />);
    expect(screen.getByText('Security Monitor')).toBeInTheDocument();
  });

  it('shows "No violations detected" when strikes is 0', () => {
    render(<InterviewSidebar {...defaultProps} strikes={0} />);
    expect(screen.getByText(/No violations detected/i)).toBeInTheDocument();
  });

  it('shows "1 violation recorded" when strikes is 1', () => {
    render(<InterviewSidebar {...defaultProps} strikes={1} />);
    expect(screen.getByText(/1 violation recorded/i)).toBeInTheDocument();
  });

  it('shows "Critical alert: One strike remaining" when strikes is 2', () => {
    render(<InterviewSidebar {...defaultProps} strikes={2} />);
    expect(screen.getByText(/Critical alert: One strike remaining/i)).toBeInTheDocument();
  });

  it('renders section headers for each question type group', () => {
    render(<InterviewSidebar {...defaultProps} />);
    expect(screen.getByText('Aptitude')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Behavioral')).toBeInTheDocument();
  });

  it('renders question buttons for each question in a group', () => {
    render(<InterviewSidebar {...defaultProps} />);
    // 2 aptitude + 2 technical + 1 behavioral = 5 buttons total
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(5);
  });

  it('calls onSelectQuestion when a non-locked button is clicked', () => {
    render(
      <InterviewSidebar
        {...defaultProps}
        completedQuestions={[0, 1]} // complete all aptitude so technical is unlocked
        currentQuestion={2}
      />
    );

    // The technical group should be unlocked — click button "1" in that group
    const techButton1 = screen.getAllByRole('button').find(
      btn => btn.textContent === '1' && !btn.hasAttribute('disabled')
    );
    expect(techButton1).toBeDefined();
    fireEvent.click(techButton1!);
    expect(defaultProps.onSelectQuestion).toHaveBeenCalled();
  });

  it('does not call onSelectQuestion when a locked button is clicked', () => {
    // With no completed aptitude questions, technical and behavioral are locked
    render(<InterviewSidebar {...defaultProps} currentQuestion={0} />);

    const disabledButtons = screen.getAllByRole('button').filter(btn =>
      btn.hasAttribute('disabled')
    );

    if (disabledButtons.length > 0) {
      fireEvent.click(disabledButtons[0]);
      expect(defaultProps.onSelectQuestion).not.toHaveBeenCalled();
    }
  });

  it('renders the Question Status Guide legend', () => {
    render(<InterviewSidebar {...defaultProps} />);
    expect(screen.getByText('Question Status Guide')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders correctly with empty allQuestions array', () => {
    render(<InterviewSidebar {...defaultProps} allQuestions={[]} />);
    // Should render security monitor and legend but no sections
    expect(screen.getByText('Security Monitor')).toBeInTheDocument();
    expect(screen.queryByText('Aptitude')).not.toBeInTheDocument();
  });

  it('shows completed count in section header', () => {
    render(
      <InterviewSidebar
        {...defaultProps}
        completedQuestions={[0]}
      />
    );
    // aptitude section should show 1/2
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('shows 0 completed for empty completedQuestions', () => {
    render(<InterviewSidebar {...defaultProps} completedQuestions={[]} />);
    // Each section header shows 0/N
    const zeroCounts = screen.getAllByText(/^0\//);
    expect(zeroCounts.length).toBeGreaterThan(0);
  });
});
