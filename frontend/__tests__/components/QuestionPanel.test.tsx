import React from 'react';
import { render, screen } from '@testing-library/react';
import QuestionPanel from '@/modules/interview/QuestionPanel';

vi.mock('lucide-react', () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  BrainCircuit: () => <svg data-testid="icon-brain" />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className} data-testid="badge">{children}</span>,
}));

describe('QuestionPanel', () => {
  it('renders the current question number', () => {
    render(
      <QuestionPanel
        question={{ question: 'What is React?', difficulty: 'easy' }}
        isLoading={false}
        currentQuestionNumber={3}
      />
    );
    expect(screen.getByText('Question 3')).toBeInTheDocument();
  });

  it('shows loader when isLoading is true', () => {
    render(
      <QuestionPanel
        question={null}
        isLoading={true}
        currentQuestionNumber={1}
      />
    );
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    expect(screen.getByText(/Analyzing context for next question/i)).toBeInTheDocument();
  });

  it('renders the question text when not loading and question provided', () => {
    render(
      <QuestionPanel
        question={{ question: 'Explain closures.', difficulty: 'medium' }}
        isLoading={false}
        currentQuestionNumber={2}
      />
    );
    expect(screen.getByText(/"Explain closures\."/i)).toBeInTheDocument();
  });

  it('shows "Initializing Assessment..." when question is null and not loading', () => {
    render(
      <QuestionPanel
        question={null}
        isLoading={false}
        currentQuestionNumber={1}
      />
    );
    expect(screen.getByText(/"Initializing Assessment\.\.\."/i)).toBeInTheDocument();
  });

  it('renders the difficulty badge with uppercase text', () => {
    render(
      <QuestionPanel
        question={{ question: 'Hard question?', difficulty: 'hard' }}
        isLoading={false}
        currentQuestionNumber={5}
      />
    );
    expect(screen.getByText(/HARD ROUND/i)).toBeInTheDocument();
  });

  it('renders "EASY ROUND" badge for easy difficulty', () => {
    render(
      <QuestionPanel
        question={{ question: 'Simple question.', difficulty: 'easy' }}
        isLoading={false}
        currentQuestionNumber={1}
      />
    );
    expect(screen.getByText(/EASY ROUND/i)).toBeInTheDocument();
  });

  it('renders "MEDIUM ROUND" badge for medium difficulty', () => {
    render(
      <QuestionPanel
        question={{ question: 'Medium question.', difficulty: 'medium' }}
        isLoading={false}
        currentQuestionNumber={2}
      />
    );
    expect(screen.getByText(/MEDIUM ROUND/i)).toBeInTheDocument();
  });

  it('does NOT render difficulty badge when question is null', () => {
    render(
      <QuestionPanel
        question={null}
        isLoading={false}
        currentQuestionNumber={1}
      />
    );
    expect(screen.queryByText(/ROUND/i)).not.toBeInTheDocument();
  });

  it('hides the question text section when loading', () => {
    render(
      <QuestionPanel
        question={{ question: 'Hidden?', difficulty: 'hard' }}
        isLoading={true}
        currentQuestionNumber={1}
      />
    );
    expect(screen.queryByText(/"Hidden\?"/)).not.toBeInTheDocument();
  });

  it('renders "Current Question" label', () => {
    render(
      <QuestionPanel
        question={{ question: 'Any', difficulty: 'easy' }}
        isLoading={false}
        currentQuestionNumber={1}
      />
    );
    expect(screen.getByText('Current Question')).toBeInTheDocument();
  });
});
