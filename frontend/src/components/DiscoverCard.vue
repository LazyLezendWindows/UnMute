<template>
  <UCard
    variant="depth3d"
    padding="none"
    class="w-full max-w-md mx-auto relative group select-none overflow-hidden"
  >
    <!-- Top photo / image area with subtle layered depth -->
    <div class="relative h-72 sm:h-84 w-full bg-slate-850 overflow-hidden">
      <img
        v-if="candidate.avatarUrl"
        :src="candidate.avatarUrl"
        :alt="candidate.displayName"
        class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
      />
      <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
        <User class="w-16 h-16 stroke-[1.5]" />
        <span class="text-xs mt-2 font-medium">No photo uploaded</span>
      </div>

      <!-- Cinematic depth gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"></div>

      <!-- Quick action safety button (Report / Block) -->
      <button
        type="button"
        @click="$emit('openSafety')"
        class="absolute top-3.5 right-3.5 p-2 rounded-2xl surface-glass text-slate-300 hover:text-white transition-all shadow-md active:scale-90"
        title="Report or Block"
      >
        <MoreVertical class="w-4 h-4" />
      </button>

      <!-- Candidate Basic Info Overlay -->
      <div class="absolute bottom-4 left-5 right-5">
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {{ candidate.displayName }}, {{ candidate.age }}
          </h2>
          <UBadge v-if="candidate.isVerified" variant="primary" size="sm">
            <CheckCircle2 class="w-3 h-3 text-sky-400" />
            <span>Verified</span>
          </UBadge>
        </div>

        <div v-if="candidate.approximateLocation" class="flex items-center gap-1.5 text-xs text-slate-300 mt-1 font-medium">
          <MapPin class="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>{{ candidate.approximateLocation }}</span>
        </div>
      </div>
    </div>

    <!-- Details Body -->
    <div class="p-5 sm:p-6 space-y-4">
      <!-- Common Interests Badge (Conversation First!) -->
      <div
        v-if="candidate.commonInterestsCount > 0"
        class="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-brand-600/15 via-purple-600/10 to-transparent border border-brand-500/25 text-brand-200 text-xs shadow-sm"
      >
        <Sparkles class="w-4 h-4 text-brand-400 shrink-0 animate-pulse-glow" />
        <span class="font-medium leading-relaxed">
          Common interests: <strong class="text-white font-semibold">{{ candidate.commonInterests.join(', ') }}</strong>
        </span>
      </div>

      <!-- Bio / Story -->
      <div v-if="candidate.bio" class="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-850/60 p-3.5 rounded-2xl border border-slate-800">
        <p class="whitespace-pre-line">{{ candidate.bio }}</p>
      </div>

      <!-- Connection Intentions / Interaction Preferences -->
      <div v-if="candidate.interactionPreferences && candidate.interactionPreferences.length > 0">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Looking for
        </span>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="pref in candidate.interactionPreferences"
            :key="pref"
            variant="glass"
            size="sm"
          >
            {{ pref }}
          </UBadge>
        </div>
      </div>

      <!-- All Interests tags -->
      <div v-if="candidate.interests && candidate.interests.length > 0">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Interests & Topics
        </span>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="interest in candidate.interests"
            :key="interest.id"
            :variant="candidate.commonInterests.includes(interest.name) ? 'primary' : 'secondary'"
            size="sm"
          >
            {{ interest.name }}
          </UBadge>
        </div>
      </div>

      <!-- Action Buttons (Pass & Like) with physical depth -->
      <div class="pt-2 flex items-center gap-3">
        <!-- Pass Button -->
        <UButton
          variant="secondary"
          size="lg"
          class="flex-1"
          @click="$emit('pass')"
        >
          <X class="w-4 h-4 text-slate-400 mr-2" />
          <span>Pass</span>
        </UButton>

        <!-- Like Button -->
        <UButton
          variant="primary"
          size="lg"
          class="flex-1"
          @click="$emit('like')"
        >
          <Heart class="w-4 h-4 fill-white mr-2" />
          <span>Connect</span>
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import {
  User,
  MapPin,
  CheckCircle2,
  Sparkles,
  Heart,
  X,
  MoreVertical,
} from 'lucide-vue-next';
import UCard from './ui/UCard.vue';
import UButton from './ui/UButton.vue';
import UBadge from './ui/UBadge.vue';
import { DiscoveryCandidate } from '../types';

defineProps<{
  candidate: DiscoveryCandidate;
}>();

defineEmits<{
  (e: 'like'): void;
  (e: 'pass'): void;
  (e: 'openSafety'): void;
}>();
</script>
