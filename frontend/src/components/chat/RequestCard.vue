<template>
  <article class="request-card" :class="{ 'is-active': active }">
    <!-- Opening a request only shows it; it never accepts it. -->
    <button type="button" class="request-open" :aria-label="`Open request from ${request.otherUser.displayName}`" @click="$emit('open')">
      <UAvatar :src="request.otherUser.avatarUrl" :name="request.otherUser.displayName" size="md" />
      <span class="request-text min-w-0">
        <span class="d-flex align-items-baseline justify-content-between gap-2">
          <span class="request-name text-truncate">{{ request.otherUser.displayName }}, {{ request.otherUser.age }}</span>
          <time class="request-time flex-shrink-0" :datetime="request.requestedAt">{{ relativeTime(request.requestedAt) }}</time>
        </span>
        <span v-if="place" class="request-place text-truncate">
          <i class="ri-map-pin-2-line" aria-hidden="true"></i> {{ place }}
        </span>
        <span class="request-preview">
          <span v-if="request.direction === 'sent'" class="fw-semibold">You: </span>{{ request.preview }}
        </span>
      </span>
    </button>

    <div class="request-actions">
      <template v-if="request.direction === 'incoming'">
        <UButton variant="primary" size="sm" :disabled="busy" @click="$emit('accept')">Accept</UButton>
        <UButton variant="secondary" size="sm" :disabled="busy" @click="$emit('decline')">Delete</UButton>
        <UButton variant="ghost" size="sm" :disabled="busy" @click="$emit('block')">
          <i class="ri-forbid-line me-1" aria-hidden="true"></i>Block
        </UButton>
      </template>
      <template v-else>
        <span class="request-status"><i class="ri-time-line" aria-hidden="true"></i> Request sent</span>
        <UButton variant="ghost" size="sm" :disabled="busy" @click="$emit('cancel')">Cancel request</UButton>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UAvatar from '../ui/UAvatar.vue';
import UButton from '../ui/UButton.vue';
import type { ChatRequestSummary } from '../../types';
import { approximatePlace, relativeTime } from './requestFormat';

const props = defineProps<{ request: ChatRequestSummary; active?: boolean; busy?: boolean }>();
defineEmits<{ (e: 'open'): void; (e: 'accept'): void; (e: 'decline'): void; (e: 'block'): void; (e: 'cancel'): void }>();

const place = computed(() => approximatePlace(props.request.otherUser));
</script>

<style scoped lang="scss">
.request-card {
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid var(--unmute-glass-border);
  transition: background-color 0.15s ease;

  &:hover,
  &.is-active {
    background-color: var(--unmute-surface-raised, #f8fafd);
  }
}

.request-open {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: start;
  font: inherit;
}

.request-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.request-name {
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.request-time,
.request-place {
  font-size: 0.6875rem;
  color: var(--unmute-text-dim);
}

.request-preview {
  font-size: 0.8125rem;
  color: var(--unmute-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.request-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.625rem;
  padding-left: 3.25rem;
}

.request-status {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--unmute-text-secondary);
  margin-right: auto;
}
</style>
