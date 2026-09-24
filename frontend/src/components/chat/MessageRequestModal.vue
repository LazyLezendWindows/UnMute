<template>
  <UModal :isOpen="isOpen" :title="`Message ${recipient.displayName}`" maxWidth="sm" @close="close">
    <form id="message-request-form" class="d-flex flex-column gap-2" @submit.prevent="send">
      <p class="small mb-1 lh-base u-text-secondary">
        Say hello with one message. {{ recipient.displayName }} decides whether to accept before you can chat.
      </p>
      <label for="message-request-text" class="visually-hidden">Your message</label>
      <textarea
        id="message-request-text"
        ref="textarea"
        v-model="content"
        class="form-control u-input-surface request-textarea"
        rows="4"
        :maxlength="maxLength"
        :placeholder="`Hi ${recipient.displayName}! I noticed we both like…`"
        :aria-describedby="error ? 'message-request-error' : 'message-request-count'"
      ></textarea>
      <div class="d-flex justify-content-between align-items-center extra-small">
        <span v-if="error" id="message-request-error" class="text-danger" role="alert">{{ error }}</span>
        <span v-else></span>
        <span id="message-request-count" :class="remaining < 20 ? 'text-warning' : 'u-text-dim'">{{ remaining }} left</span>
      </div>
    </form>
    <template #footer>
      <UButton variant="secondary" size="md" @click="close">Cancel</UButton>
      <UButton type="submit" form="message-request-form" variant="primary" size="md" :loading="sending" :disabled="!content.trim()">
        <i class="ri-send-plane-2-fill me-1" aria-hidden="true"></i>Send request
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import UModal from '../ui/UModal.vue';
import UButton from '../ui/UButton.vue';
import { ApiError } from '../../services/api';
import { loadAuthConfig } from '../../services/authConfig';
import { useChatStore } from '../../stores/chat';
import { useToastStore } from '../../stores/toast';

const props = defineProps<{ isOpen: boolean; recipient: { id: string; displayName: string } }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'sent'): void }>();

const router = useRouter();
const chatStore = useChatStore();
const content = ref('');
const sending = ref(false);
const error = ref('');
const maxLength = ref(500);
const textarea = ref<HTMLTextAreaElement | null>(null);
const remaining = computed(() => maxLength.value - content.value.length);

onMounted(async () => {
  try {
    maxLength.value = (await loadAuthConfig()).chatRequestMessageMax;
  } catch {
    // Keep the default; the server enforces the real limit either way.
  }
});

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    content.value = '';
    error.value = '';
    nextTick(() => textarea.value?.focus());
  }
);

function close() {
  if (!sending.value) emit('close');
}

async function send() {
  if (!content.value.trim() || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    const outcome = await chatStore.sendRequest(props.recipient.id, content.value);
    emit('sent');
    emit('close');
    if (outcome.status === 'accepted') {
      router.push(`/chat/${outcome.conversationId}`);
    } else {
      useToastStore().success(`Request sent to ${props.recipient.displayName}`);
    }
  } catch (err) {
    if (err instanceof ApiError && err.code === 'REQUEST_PENDING') {
      emit('close');
      useToastStore().info(`You already sent ${props.recipient.displayName} a request. They'll see it in their Requests.`);
      return;
    }
    error.value = err instanceof Error && err.message ? err.message : 'Your request could not be sent. Please try again.';
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped lang="scss">
.request-textarea {
  border-radius: var(--unmute-radius-md, 14px);
  resize: vertical;
  min-height: 6rem;
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
