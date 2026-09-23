import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UTypeahead from '../../src/components/ui/UTypeahead.vue';

type Item = { id: string; name: string };

function setup(fetchItems: (q: string) => Promise<Item[]>) {
  return mount(UTypeahead<Item>, {
    props: {
      modelValue: null,
      fetchItems,
      itemKey: (i: Item) => i.id,
      itemLabel: (i: Item) => i.name,
      label: 'Place',
    },
    attachTo: document.body,
  });
}

describe('UTypeahead', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces, waits for 2 characters, and exposes combobox state', async () => {
    const fetchItems = vi.fn(async () => [{ id: '1', name: 'Hyderabad' }]);
    const w = setup(fetchItems);
    const input = w.find('input[role="combobox"]');
    await input.setValue('h');
    vi.advanceTimersByTime(500);
    expect(fetchItems).not.toHaveBeenCalled();

    await input.setValue('hy');
    await input.setValue('hyd');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(fetchItems).toHaveBeenCalledTimes(1);
    expect(fetchItems).toHaveBeenCalledWith('hyd');
    expect(input.attributes('aria-expanded')).toBe('true');
    expect(input.attributes('aria-activedescendant')).toBe(w.find('[role="option"]').attributes('id'));
  });

  it('ignores a slow response that arrives after a newer one', async () => {
    let resolveSlow: (items: Item[]) => void = () => {};
    const fetchItems = vi
      .fn<(q: string) => Promise<Item[]>>()
      .mockImplementationOnce(() => new Promise((r) => (resolveSlow = r)))
      .mockImplementationOnce(async () => [{ id: '2', name: 'Pune' }]);
    const w = setup(fetchItems);
    const input = w.find('input');
    await input.setValue('hyd');
    vi.advanceTimersByTime(300);
    await input.setValue('pun');
    vi.advanceTimersByTime(300);
    await flushPromises();
    resolveSlow([{ id: '1', name: 'Hyderabad' }]);
    await flushPromises();
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Pune']);
  });

  it('selects with Enter, closes with Escape, and shows fetch errors', async () => {
    const w = setup(async () => [{ id: '1', name: 'Hyderabad' }]);
    const input = w.find('input');
    await input.setValue('hyd');
    vi.advanceTimersByTime(300);
    await flushPromises();
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('update:modelValue')?.[0]).toEqual([{ id: '1', name: 'Hyderabad' }]);

    const failing = setup(async () => {
      throw new Error('Search failed here');
    });
    const i2 = failing.find('input');
    await i2.setValue('abc');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(failing.text()).toContain('Search failed here');
    await i2.trigger('keydown', { key: 'Escape' });
    expect(i2.attributes('aria-expanded')).toBe('false');
  });
});
