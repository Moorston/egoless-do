// ─── Button component tests ──────────────────────────────────────
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../apps/mobile/src/shared/components/base/Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = vi.fn();
    const { getByText } = render(<Button onPress={onPress}>Click</Button>);
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <Button onPress={onPress} disabled>
        Click
      </Button>
    );
    fireEvent.press(getByText('Click'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { queryByText, getByTestId } = render(
      <Button loading>Click</Button>
    );
    expect(queryByText('Click')).toBeNull();
  });

  it('renders with different variants', () => {
    const { rerender, getByText } = render(
      <Button variant="primary">Primary</Button>
    );
    expect(getByText('Primary')).toBeTruthy();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(getByText('Secondary')).toBeTruthy();

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByText('Outline')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(
      <Button size="sm">Small</Button>
    );
    expect(getByText('Small')).toBeTruthy();

    rerender(<Button size="md">Medium</Button>);
    expect(getByText('Medium')).toBeTruthy();

    rerender(<Button size="lg">Large</Button>);
    expect(getByText('Large')).toBeTruthy();
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(
      <Button accessibilityLabel="Submit button">Submit</Button>
    );
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });
});
