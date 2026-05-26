import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreIndicator from '@/modules/interview/ScoreIndicator';

// Mock lucide-react icons to avoid SVG rendering issues
vi.mock('lucide-react', () => ({
  Star: () => <svg data-testid="icon-star" />,
  TrendingUp: () => <svg data-testid="icon-trending-up" />,
  Award: () => <svg data-testid="icon-award" />,
  CheckCircle2: () => <svg data-testid="icon-check-circle" />,
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" aria-valuenow={value} />
  ),
}));

describe('ScoreIndicator', () => {
  it('renders the waiting state when feedback is null', () => {
    render(<ScoreIndicator feedback={null} />);
    expect(screen.getByText('Waiting for response...')).toBeInTheDocument();
    expect(screen.getByText(/AI will evaluate your first answer live/i)).toBeInTheDocument();
    expect(screen.getByText('Live Performance Status')).toBeInTheDocument();
  });

  it('does NOT render the score badge when feedback is null', () => {
    render(<ScoreIndicator feedback={null} />);
    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  it('renders the score when feedback is provided', () => {
    render(<ScoreIndicator feedback={{ score: 7, text: 'Good answer.' }} />);
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('renders the feedback text when feedback is provided', () => {
    render(<ScoreIndicator feedback={{ score: 8, text: 'Excellent response!' }} />);
    expect(screen.getByText(/"Excellent response!"/i)).toBeInTheDocument();
  });

  it('renders the correct progress percentage (score * 10)', () => {
    render(<ScoreIndicator feedback={{ score: 6, text: 'Average.' }} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '60');
  });

  it('renders 100% progress for a perfect score of 10', () => {
    render(<ScoreIndicator feedback={{ score: 10, text: 'Perfect!' }} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders 0% progress for a score of 0', () => {
    render(<ScoreIndicator feedback={{ score: 0, text: 'No answer.' }} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '0');
  });

  it('displays "Real-time Evaluation" header when feedback is present', () => {
    render(<ScoreIndicator feedback={{ score: 5, text: 'Okay.' }} />);
    expect(screen.getByText('Real-time Evaluation')).toBeInTheDocument();
  });

  it('displays Expert Feedback section when feedback is present', () => {
    render(<ScoreIndicator feedback={{ score: 9, text: 'Outstanding.' }} />);
    expect(screen.getByText('Expert Feedback')).toBeInTheDocument();
  });

  it('displays the score percentage label', () => {
    render(<ScoreIndicator feedback={{ score: 7, text: 'Good.' }} />);
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('renders green styling for score >= 8', () => {
    render(<ScoreIndicator feedback={{ score: 8, text: 'Great.' }} />);
    const badge = screen.getByText('8/10');
    expect(badge.className).toMatch(/green/);
  });

  it('renders amber styling for score between 5-7', () => {
    render(<ScoreIndicator feedback={{ score: 6, text: 'Average.' }} />);
    const badge = screen.getByText('6/10');
    expect(badge.className).toMatch(/amber/);
  });

  it('renders red styling for score below 5', () => {
    render(<ScoreIndicator feedback={{ score: 3, text: 'Poor.' }} />);
    const badge = screen.getByText('3/10');
    expect(badge.className).toMatch(/red/);
  });
});
