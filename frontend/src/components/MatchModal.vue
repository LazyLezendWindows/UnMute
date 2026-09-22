<template>
  <UModal
    :is-open="Boolean(match)"
    max-width="sm"
    @close="dismiss"
  >
    <div v-if="match" class="text-center py-2 d-flex flex-column gap-3">
      <!-- Badge -->
      <div>
        <div class="match-sparkle-badge d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill fw-bold user-select-none">
          <Sparkles class="sparkle-icon" />
          <span>Mutual Connection</span>
        </div>
      </div>

      <!-- Connected Avatars with 3D overlap -->
      <div class="d-flex align-items-center justify-content-center py-2 avatar-overlap">
        <div class="avatar-left position-relative">
          <UAvatar
            :src="myAvatar"
            name="You"
            size="2xl"
            :border="true"
          />
        </div>
        <div class="avatar-right position-relative">
          <UAvatar
            :src="match.matchedUser.avatarUrl"
            :name="match.matchedUser.displayName"
            size="2xl"
            :border="true"
          />
        </div>
      </div>

      <!-- Title & Philosophy -->
      <div>
        <h2 class="fs-4 fw-extrabold text-white mb-1 font-display">
          You and {{ match.matchedUser.displayName }} clicked!
        </h2>
        <p class="small text-white-50 mb-0 max-w-xs mx-auto">
          No awkward pickup lines needed. Connect on your shared interests without the pressure.
        </p>
      </div>

      <!-- Quick Conversation Starter -->
      <div class="d-flex flex-column gap-2 pt-1">
        <input
          v-model="quickMessage"
          type="text"
          placeholder="Say hello or ask about their interests..."
          class="form-control form-control-dark-custom w-100"
          @keyup.enter="sendAndOpen"
        />

        <UButton
          variant="primary"
          size="lg"
          block
          @click="sendAndOpen"
        >
          Send & Open Chat
        </UButton>
      </div>

      <!-- Dismiss Button -->
      <div>
        <button
          type="button"
          @click="dismiss"
          class="btn btn-link btn-sm text-decoration-none text-muted p-0"
        >
          Keep discovering for now
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import UModal from './ui/UModal.vue';
import UAvatar from './ui/UAvatar.vue';
import UButton from './ui/UButton.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const props = defineProps<{
  match: {
    conversationId: string;
    matchedUser: {
      id: string;
      displayName: string;
      age: number;
      avatarUrl?: string;
    };
  } | null;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

const quickMessage = ref('');
const myAvatar = computed(() => authStore.profile?.avatarUrl);

function dismiss() {
  quickMessage.value = '';
  emit('dismiss');
}

async function sendAndOpen() {
  if (!props.match) return;
  const conversationId = props.match.conversationId;

  if (quickMessage.value.trim()) {
    try {
      await chatStore.openConversation(conversationId);
      await chatStore.sendMessage(quickMessage.value.trim());
    } catch (err) {
      console.error(err);
    }
  }

  dismiss();
  router.push(`/chat/${conversationId}`);
}
</script>

<style scoped lang="scss">
.match-sparkle-badge {
  font-size: 0.75rem;
  background: rgba(99, 102, 241, 0.15);
  color: var(--theme-primary, #6366f1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.2);

  .sparkle-icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}

.avatar-overlap {
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}

.avatar-left {
  z-index: 1;
  margin-right: -1.25rem;
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.05); }
}

.avatar-right {
  z-index: 2;
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.08); }
}

.form-control-dark-custom {
  background-color: var(--unmute-surface-raised, #161e31);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.12));
  color: #ffffff;
  border-radius: var(--radius-md, 14px);
  padding: 0.65rem 1rem;
  font-size: 0.875rem;

  &:focus {
    background-color: var(--unmute-surface-raised, #161e31);
    border-color: var(--theme-primary, #6366f1);
    box-shadow: 0 0 0 3px var(--theme-glow, rgba(99, 102, 241, 0.25));
    color: #ffffff;
  }

  &::placeholder {
    color: var(--unmute-text-muted, #64748b);
  }
}
</style>
