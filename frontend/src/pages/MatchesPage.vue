<template>
  <div class="space-y-6 max-w-2xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Your Matches</h1>
        <p class="text-xs text-slate-400">People you connected with mutually</p>
      </div>
      <UBadge variant="primary" size="md">
        {{ chatStore.matches.length }} Matches
      </UBadge>
    </div>

    <!-- Empty State -->
    <UEmptyState
      v-if="chatStore.matches.length === 0"
      title="No matches yet"
      description="When someone you like also likes you back, they will appear here and you can chat freely."
      :icon="Sparkles"
    >
      <template #action>
        <UButton
          variant="primary"
          size="md"
          @click="$router.push('/discover')"
        >
          <span>Discover People</span>
        </UButton>
      </template>
    </UEmptyState>

    <!-- Matches Grid using Bootstrap 5 row & cols + UCard interactive -->
    <div v-else class="row g-3">
      <div
        v-for="match in chatStore.matches"
        :key="match.matchId"
        class="col-12 col-sm-6"
      >
        <UCard
          variant="interactive"
          padding="md"
          class="h-full flex flex-col justify-between group"
        >
          <div class="flex items-start gap-3">
            <UAvatar
              :src="match.user.avatarUrl"
              :name="match.user.displayName"
              size="lg"
            />

            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-sm text-white truncate group-hover:text-brand-300 transition-colors">
                {{ match.user.displayName }}, {{ match.user.age }}
              </h3>
              <p v-if="match.user.approximateLocation" class="text-[11px] text-slate-400 truncate mt-0.5">
                {{ match.user.approximateLocation }}
              </p>

              <!-- Interests -->
              <div v-if="match.user.interests && match.user.interests.length > 0" class="flex flex-wrap gap-1 mt-2">
                <UBadge
                  v-for="int in match.user.interests.slice(0, 2)"
                  :key="int"
                  variant="secondary"
                  size="sm"
                >
                  {{ int }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Chat button -->
          <div class="pt-4 mt-auto">
            <UButton
              variant="secondary"
              size="sm"
              block
              @click="$router.push(`/chat/${match.conversationId}`)"
            >
              <MessageSquare class="w-3.5 h-3.5 mr-1.5 text-brand-400" />
              <span v-if="match.lastMessage">Continue Conversation</span>
              <span v-else>Say Hello</span>
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { Sparkles, MessageSquare } from 'lucide-vue-next';
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UBadge from '../components/ui/UBadge.vue';
import UButton from '../components/ui/UButton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();

onMounted(() => {
  chatStore.loadMatches();
});
</script>
