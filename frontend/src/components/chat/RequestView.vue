<template>
  <div class="d-flex flex-column h-100 min-h-0">
    <div class="px-3 py-2 border-bottom d-flex align-items-center gap-2 surface-glass u-border-glass">
      <button
        type="button"
        class="d-md-none btn btn-sm btn-link p-1 me-1 text-decoration-none u-text-secondary"
        aria-label="Back to requests"
        @click="$emit('back')"
      >
        <i class="ri-arrow-left-s-line fs-5" aria-hidden="true"></i>
      </button>
      <UAvatar :src="request.otherUser.avatarUrl" :name="request.otherUser.displayName" size="sm" />
      <div class="min-w-0">
        <h2 class="fw-bold fs-6 mb-0 text-truncate u-text-primary">
          {{ request.otherUser.displayName }}, {{ request.otherUser.age }}
        </h2>
        <span class="extra-small d-block text-truncate u-text-dim">
          {{ request.direction === 'incoming' ? 'Message request' : 'Request sent' }}
          <template v-if="place"> · {{ place }}</template>
        </span>
      </div>
    </div>

    <div class="flex-grow-1 overflow-y-auto p-3 p-sm-4 d-flex flex-column gap-3">
      <p class="small text-center mb-0 u-text-secondary">
        <template v-if="request.direction === 'incoming'">
          {{ request.otherUser.displayName }} wants to chat. They won't know you've seen this until you accept.
        </template>
        <template v-else>
          Waiting for {{ request.otherUser.displayName }} to accept. You can send more messages once they do.
        </template>
      </p>

      <div v-if="request.message" class="d-flex flex-column" :class="request.message.fromMe ? 'align-items-end' : 'align-items-start'">
        <div class="request-bubble" :class="request.message.fromMe ? 'is-mine' : 'is-theirs'">
          <p class="mb-0 text-break u-pre-line">{{ request.message.content }}</p>
        </div>
        <time class="extra-small mt-1 px-1 u-text-dim" :datetime="request.message.createdAt">
          {{ relativeTime(request.message.createdAt) }}
        </time>
      </div>

      <CandidateDetails :candidate="request.otherUser" />
    </div>

    <div class="p-3 border-top surface-glass u-border-glass d-flex flex-wrap align-items-center gap-2">
      <template v-if="request.direction === 'incoming'">
        <UButton variant="primary" size="md" :loading="busy === 'accept'" :disabled="Boolean(busy)" @click="$emit('accept')">
          <i class="ri-check-line me-1" aria-hidden="true"></i>Accept
        </UButton>
        <UButton variant="secondary" size="md" :loading="busy === 'decline'" :disabled="Boolean(busy)" @click="$emit('decline')">
          Delete
        </UButton>
        <UButton variant="ghost" size="md" :disabled="Boolean(busy)" class="ms-auto" @click="$emit('block')">
          <i class="ri-forbid-line me-1" aria-hidden="true"></i>Block or report
        </UButton>
      </template>
      <template v-else>
        <span class="small fw-semibold me-auto u-text-secondary">
          <i class="ri-time-line me-1" aria-hidden="true"></i>Request sent
        </span>
        <UButton variant="ghost" size="md" :loading="busy === 'cancel'" :disabled="Boolean(busy)" @click="$emit('cancel')">
          Cancel request
        </UButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UAvatar from '../ui/UAvatar.vue';
import UButton from '../ui/UButton.vue';
import CandidateDetails from '../discovery/CandidateDetails.vue';
import type { ChatRequestDetail } from '../../types';
import { approximatePlace, relativeTime } from './requestFormat';

const props = defineProps<{ request: ChatRequestDetail; busy?: 'accept' | 'decline' | 'cancel' | null }>();
defineEmits<{ (e: 'back'): void; (e: 'accept'): void; (e: 'decline'): void; (e: 'block'): void; (e: 'cancel'): void }>();

const place = computed(() => approximatePlace(props.request.otherUser));
</script>

<style scoped lang="scss">
.min-h-0 {
  min-height: 0;
}

.request-bubble {
  max-width: 80%;
  border-radius: var(--unmute-radius-md, 18px);
  padding: 0.65rem 1rem;
  font-size: 0.875rem;

  &.is-mine {
    background: var(--unmute-primary-gradient);
    box-shadow: 0 2px 0 var(--unmute-primary-bevel), var(--unmute-3d-specular);
    color: #ffffff;
    border-bottom-right-radius: 4px;
  }

  &.is-theirs {
    background-color: var(--unmute-surface-raised, #f8fafd);
    color: var(--unmute-text-primary);
    border: 1px solid var(--unmute-glass-border);
    border-bottom-left-radius: 4px;
    box-shadow: var(--unmute-shadow-sm);
  }
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
