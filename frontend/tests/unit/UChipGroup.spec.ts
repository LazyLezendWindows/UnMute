import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UChipGroup from '../../src/components/ui/UChipGroup.vue';

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
  { value: 'c', label: 'C' },
];

describe('UChipGroup', () => {
  it('is a labelled radio group with one tab stop on the selected option', () => {
    const w = mount(UChipGroup, { props: { modelValue: 'c', options, label: 'Pick' } });
    expect(w.attributes('role')).toBe('radiogroup');
    expect(w.attributes('aria-label')).toBe('Pick');
    const radios = w.findAll('[role="radio"]');
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'false', 'true']);
    expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['-1', '-1', '0']);
  });

  it('emits on click and skips disabled options with arrow keys', async () => {
    const w = mount(UChipGroup, { props: { modelValue: 'a', options, label: 'Pick' } });
    await w.trigger('keydown', { key: 'ArrowRight' });
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['c']);
    await w.findAll('[role="radio"]')[0].trigger('click');
    // Re-selecting the current value is not a change.
    expect(w.emitted('update:modelValue')).toHaveLength(1);
  });
});
