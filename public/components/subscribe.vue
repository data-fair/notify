<template>
  <v-col class="py-0 px-1">
    <v-switch
      class="mt-1"
      :loading="loading"
      :label="topic.title"
      hide-details
      dense
      :value="!!subscription"
      @change="switchSubscription"
    />

    <template v-if="subscription">
      <v-checkbox
        v-if="outputs.includes('devices')"
        v-model="subscription.outputs"
        dense
        hide-details
        class="ml-10 mt-0"
        :label="$t('devices')"
        value="devices"
        @change="sendSubscription(subscription)"
      />
      <v-checkbox
        v-if="outputs.includes('email')"
        v-model="subscription.outputs"
        dense
        hide-details
        class="ml-10 mt-0"
        :label="$t('email')"
        value="email"
        @change="sendSubscription(subscription)"
      />
    </template>
  </v-col>
</template>

<i18n lang="yaml">
fr:
  devices: notification sur appareils configurés
  email: email
</i18n>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  props: {
    topic: { type: Object, default: null },
    noSender: { type: Boolean, default: false },
    icon: { type: String, default: null },
    urlTemplate: { type: String, default: null },
    outputs: { type: Array, default: () => ['email', 'devices'] }
  },
  data: () => ({
    subscription: null,
    loading: true
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  async mounted () {
    this.refresh()
  },
  methods: {
    async refresh () {
      this.loading = true
      const params = {
        recipient: this.user.id,
        topic: this.topic.key
      }
      if (this.noSender) {
        params.noSender = 'true'
      } else {
        params.senderType = this.activeAccount.type
        params.senderId = this.activeAccount.id
      }
      this.subscription = (await this.$axios.$get('api/v1/subscriptions', { params })).results[0]
      if (this.subscription) {
        if (this.subscription.outputs.includes('devices')) this.$emit('register')
        this.subscription.locale = this.$i18n.locale
        if (this.icon) this.subscription.icon = this.icon
        if (this.urlTemplate) this.subscription.urlTemplate = this.urlTemplate
      }

      this.loading = false
    },
    async switchSubscription () {
      this.loading = true
      if (!this.subscription) {
        const subscription = {
          recipient: { id: this.user.id, name: this.user.name },
          topic: this.topic,
          outputs: [],
          locale: this.$i18n.locale
        }
        if (!this.noSender) subscription.sender = this.activeAccount
        if (this.icon) subscription.icon = this.icon
        if (this.urlTemplate) subscription.urlTemplate = this.urlTemplate
        await this.sendSubscription(subscription)
        await this.refresh()
      } else {
        await this.$axios.$delete('api/v1/subscriptions/' + this.subscription._id)
        this.subscription = null
      }
      this.loading = false
    },
    async sendSubscription (subscription) {
      await this.$axios.$post('api/v1/subscriptions', subscription)
      if (subscription?.outputs.includes('devices')) this.$emit('register')
    }
  }
}
</script>

<style lang="css" scoped>
</style>
