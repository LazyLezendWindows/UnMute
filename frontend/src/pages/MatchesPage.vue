<template>
  <div class="matches-page">
    <header class="page-top">
      <div>
        <h1 class="page-title">Matches</h1>
        <p class="page-sub">People who liked you too</p>
      </div>
      <router-link to="/settings" class="icon-link" aria-label="Settings">
        <i class="ri-settings-3-line" aria-hidden="true"></i>
      </router-link>
    </header>

    <UInput
      v-model="search"
      label="Search matches"
      hide-label
      icon-class="ri-search-line"
      placeholder="Search matches"
      autocomplete="off"
    />

    <div class="filter-row" role="group" aria-label="Show">
      <button
        v-for="option in filterOptions"
        :key="option.id"
        type="button"
        class="filter-pill"
        :class="{ 'is-active': filter === option.id }"
        :aria-pressed="filter === option.id"
        @click="filter = option.id"
      >
        {{ option.label }}
        <span v-if="option.count !== null" class="filter-pill-count">{{ option.count }}</span>
      </button>
    </div>

    <div v-if="loading" class="d-flex flex-column gap-2" aria-busy="true">
      <USkeleton v-for="n in 4" :key="n" type="card" height="4.5rem" />
    </div>

    <UEmptyState
      v-else-if="rows.length === 0 && !search && filter === 'all'"
      title="No matches yet"
      description="When someone you like likes you back, they appear here and you can chat."
    >
      <template #icon><i class="ri-hearts-line fs-2"></i></template>
      <template #action>
        <UButton variant="primary" size="md" @click="$router.push('/discover')">Discover people</UButton>
      </template>
    </UEmptyState>

    <p v-else-if="visibleRows.length === 0" class="no-results">
      {{ search ? `No one called "${search}" here.` : emptyFilterText }}
    </p>

    <ul v-else class="match-list" aria-label="Matches and likes">
      <li v-for="row in visibleRows" :key="row.key">
        <button type="button" class="match-row" @click="open(row)">
          <span class="row-avatar">
            <UAvatar :src="row.avatarUrl" :name="row.name" size="md" />
            <span v-if="row.presence?.online" class="online-dot" aria-hidden="true"></span>
          </span>
          <span class="row-text">
            <span class="row-name">
              {{ row.name }}, {{ row.age }}
              <i v-if="row.verified" class="ri-verified-badge-fill row-verified" aria-label="Verified"></i>
              <span v-if="row.presence?.online" class="visually-hidden">, online</span>
            </span>
            <span class="row-sub" :class="{ 'is-unread': row.unread }">{{ row.subtitle }}</span>
          </span>
          <span class="row-meta">
            <time :datetime="row.at">{{ relativeTime(row.at) }}</time>
            <i v-if="row.kind === 'like'" class="ri-heart-3-line row-like" aria-label="Liked you"></i>
            <span v-else-if="row.isNew" class="row-new">New</span>
          </span>
        </button>
      </li>
    </ul>

    <!-- Someone who liked you: see who they are, then answer. -->
    <UModal :isOpen="Boolean(likeTarget)" :title="likeTarget ? `${likeTarget.user.displayName} liked you` : ''" maxWidth="sm" @close="likeTarget = null">
      <div v-if="likeTarget" class="like-sheet">
        <div class="like-photo" :style="photoStyle(likeTarget.user.photos[0] || likeTarget.user.avatarUrl)">
          <span v-if="!likeTarget.user.photos.length && !likeTarget.user.avatarUrl">{{ likeTarget.user.displayName.charAt(0) }}</span>
        </div>
        <h2 class="like-name">
          {{ likeTarget.user.displayName }}, {{ likeTarget.user.age }}
          <i v-if="likeTarget.user.isVerified" class="ri-verified-badge-fill row-verified" aria-label="Verified"></i>
        </h2>
        <p v-if="likeTarget.user.approximateLocation" class="like-line">
          <i class="ri-map-pin-2-line" aria-hidden="true"></i> {{ likeTarget.user.approximateLocation }}
          <template v-if="likeTarget.user.distanceKm !== null"> · {{ likeTarget.user.distanceKm }} km</template>
        </p>
        <p v-if="likeTarget.user.profession" class="like-line">
          <i class="ri-briefcase-4-line" aria-hidden="true"></i> {{ likeTarget.user.profession }}
        </p>
      </div>
      <template #footer>
        <UButton variant="secondary" size="md" :disabled="answering" @click="answer('pass')">Pass</UButton>
        <UButton variant="primary" size="md" :loading="answering" @click="answer('like')">
          <i class="ri-heart-3-fill me-1" aria-hidden="true"></i>Like back
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import UAvatar from '../components/ui/UAvatar.vue';
import UButton from '../components/ui/UButton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import UInput from '../components/ui/UInput.vue';
import UModal from '../components/ui/UModal.vue';
import USkeleton from '../components/ui/USkeleton.vue';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { relativeTime } from '../components/chat/requestFormat';
import type { IncomingLike, Presence } from '../types';

type Filter = 'all' | 'new' | 'nearby' | 'online';

interface Row {
  key: string;
  kind: 'match' | 'like';
  userId: string;
  name: string;
  age: number;
  verified: boolean;
  avatarUrl: string;
  subtitle: string;
  at: string;
  isNew: boolean;
  unread: boolean;
  presence: Presence | undefined;
  distanceKm: number | null | undefined;
  conversationId?: string;
  like?: IncomingLike;
}

/** "Nearby" on this screen: within this many kilometres (bucketed distances, never exact). */
const NEARBY_KM = 10;

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();
const search = ref('');
const filter = ref<Filter>('all');
const loading = ref(true);
const likeTarget = ref<IncomingLike | null>(null);
const answering = ref(false);

onMounted(async () => {
  await Promise.all([chatStore.loadMatches(), chatStore.loadIncomingLikes(), chatStore.loadConversations()]);
  loading.value = false;
});

const rows = computed<Row[]>(() => {
  const me = authStore.user?.id;
  const unreadByConversation = new Map(chatStore.conversations.map((c) => [c.id, c.unreadCount]));
  const matchRows: Row[] = chatStore.matches.map((m) => {
    const last = m.lastMessage;
    const lastText = last ? (last.content || (last.attachmentUrl ? '📷 Photo' : '')) : '';
    return {
      key: `m-${m.matchId}`,
      kind: 'match',
      userId: m.user.id,
      name: m.user.displayName,
      age: m.user.age,
      verified: m.user.isVerified,
      avatarUrl: m.user.avatarUrl,
      subtitle: last ? (last.senderId === me ? `You: ${lastText}` : lastText) : `Matched ${relativeTime(m.createdAt)}${/^\d/.test(relativeTime(m.createdAt)) ? ' ago' : ''}`,
      at: m.lastMessageAt || m.createdAt,
      isNew: Boolean(m.isNew),
      unread: (unreadByConversation.get(m.conversationId) ?? 0) > 0,
      presence: m.user.presence,
      distanceKm: m.user.distanceKm,
      conversationId: m.conversationId,
    };
  });
  const likeRows: Row[] = chatStore.incomingLikes.map((l) => ({
    key: `l-${l.user.id}`,
    kind: 'like',
    userId: l.user.id,
    name: l.user.displayName,
    age: l.user.age,
    verified: l.user.isVerified,
    avatarUrl: l.user.photos[0] || l.user.avatarUrl,
    subtitle: 'Liked your profile',
    at: l.likedAt,
    isNew: true,
    unread: false,
    presence: l.user.presence,
    distanceKm: l.user.distanceKm,
    like: l,
  }));
  return [...matchRows, ...likeRows].sort((a, b) => b.at.localeCompare(a.at));
});

function matchesFilter(row: Row, f: Filter): boolean {
  if (f === 'new') return row.isNew;
  if (f === 'nearby') return row.distanceKm !== null && row.distanceKm !== undefined && row.distanceKm <= NEARBY_KM;
  if (f === 'online') return Boolean(row.presence?.online);
  return true;
}

const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value.filter((r) => matchesFilter(r, filter.value) && (!q || r.name.toLowerCase().includes(q)));
});

const filterOptions = computed(() => [
  { id: 'all' as const, label: 'All', count: rows.value.length },
  { id: 'new' as const, label: 'New', count: rows.value.filter((r) => r.isNew).length },
  { id: 'nearby' as const, label: 'Nearby', count: null },
  { id: 'online' as const, label: 'Online', count: null },
]);

const emptyFilterText = computed(
  () =>
    ({
      new: 'No new matches or likes right now.',
      nearby: authStore.profile?.location ? `No one within ${NEARBY_KM} km yet.` : 'Set your area on your profile to see who is nearby.',
      online: 'No one is online right now.',
      all: '',
    })[filter.value]
);

function open(row: Row) {
  if (row.kind === 'match') router.push(`/chat/${row.conversationId}`);
  else likeTarget.value = row.like!;
}

async function answer(choice: 'like' | 'pass') {
  if (!likeTarget.value) return;
  answering.value = true;
  const target = likeTarget.value;
  try {
    const conversationId = await chatStore.answerLike(target.user.id, choice);
    likeTarget.value = null;
    if (conversationId) {
      useToastStore().success(`You and ${target.user.displayName} matched!`);
      router.push(`/chat/${conversationId}`);
    }
  } catch (err: any) {
    useToastStore().error(err.message || 'Something went wrong. Please try again.');
  } finally {
    answering.value = false;
  }
}

function photoStyle(url: string | undefined) {
  return url ? { backgroundImage: `url("${url.replace(/"/g, '%22')}")` } : {};
}
</script>

<style scoped lang="scss">
.matches-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 40rem;
  margin: 0 auto;
}

.page-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
}

.page-sub {
  margin: 0.15rem 0 0;
  color: var(--unmute-text-muted);
}

.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  color: var(--unmute-text-secondary);
  font-size: 1.35rem;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);

  &:hover {
    color: var(--unmute-text-primary);
  }
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  scrollbar-width: none;
}

.filter-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: var(--unmute-radius-pill);
  border: 1px solid var(--unmute-glass-border);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  font-size: 0.875rem;
  font-weight: 600;

  &.is-active {
    color: #fff;
    border-color: transparent;
    background: var(--unmute-primary-gradient);
  }
}

.filter-pill-count {
  min-width: 1.4rem;
  padding: 0 0.35rem;
  border-radius: var(--unmute-radius-pill);
  font-size: 0.75rem;
  background: var(--unmute-primary-surface);
  color: var(--unmute-accent-text);

  .is-active & {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
}

.no-results {
  margin: 1.5rem 0;
  text-align: center;
  color: var(--unmute-text-muted);
}

.match-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-lg);
  overflow: hidden;

  li + li {
    border-top: 1px solid var(--unmute-glass-border);
  }
}

.match-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  padding: 0.8rem 1rem;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: start;

  &:hover {
    background: var(--unmute-surface-raised);
  }
}

.row-avatar {
  position: relative;
  flex-shrink: 0;
}

.online-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: var(--unmute-success);
  box-shadow: 0 0 0 2px var(--unmute-surface);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.row-name {
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.row-verified {
  color: #3b82f6;
}

.row-sub {
  font-size: 0.875rem;
  color: var(--unmute-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.is-unread {
    color: var(--unmute-text-primary);
    font-weight: 600;
  }
}

.row-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--unmute-text-dim);
}

.row-like {
  color: var(--unmute-accent-text);
  font-size: 1.1rem;
}

.row-new {
  padding: 0.05rem 0.5rem;
  border-radius: var(--unmute-radius-pill);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--unmute-accent-text);
  background: var(--unmute-primary-surface);
}

.like-sheet {
  text-align: center;
}

.like-photo {
  width: 100%;
  aspect-ratio: 4 / 5;
  max-height: 22rem;
  border-radius: var(--unmute-radius-lg);
  background: linear-gradient(150deg, #ff8fb5 0%, #e3175c 55%, #8e1d8c 100%) center / cover;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.like-name {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
}

.like-line {
  margin: 0.15rem 0 0;
  color: var(--unmute-text-secondary);
}
</style>
