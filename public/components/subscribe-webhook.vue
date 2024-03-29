<template>
  <v-expansion-panels
    v-model="currentPanel"
    dense
    inset
  >
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="loading"
        stream
        height="4"
        style="margin:0;"
      />
    </div>
    <template v-if="subscriptions">
      <v-expansion-panel
        v-for="subscription in subscriptions"
        :key="subscription._id"
      >
        <v-expansion-panel-header>{{ subscription.title }}</v-expansion-panel-header>
        <v-expansion-panel-content>
          <webhook-subscription-form
            :initial-subscription="subscription"
            @refresh="refresh"
          />
          <webhook-history :subscription="subscription" />
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel v-if="!loading">
        <v-expansion-panel-header>{{ $t('new') }}</v-expansion-panel-header>
        <v-expansion-panel-content>
          <webhook-subscription-form
            :initial-subscription="{topic, sender: sender || activeAccount}"
            @refresh="refresh"
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </template>
  </v-expansion-panels>
</template>

<i18n lang="yaml">
fr:
  new: Déclarer un nouveau Webhook
  email: email
</i18n>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  props: {
    topic: { type: Object, default: null },
    noSender: { type: Boolean, default: false },
    sender: { type: Object, default: null }
  },
  data: () => ({
    subscriptions: null,
    loading: true,
    currentPanel: null
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  async mounted () {
    this.refresh()
  },
  methods: {
    async refresh (id) {
      this.loading = true
      const params = {
        recipient: this.user.id,
        topic: this.topic.key,
        size: 100
      }
      if (this.noSender) {
        params.noSender = 'true'
      } else if (this.sender) {
        params.sender = this.sender.type + ':' + this.sender.id
      } else {
        params.sender = this.activeAccount.type + ':' + this.activeAccount.id
      }
      this.subscriptions = (await this.$axios.$get('api/v1/webhook-subscriptions', { params })).results

      this.loading = false

      if (id) {
        this.currentPanel = null
        await this.$nextTick()
        this.currentPanel = this.subscriptions.findIndex(s => s._id === id)
      }
    },
    async saveSubscription (subscription) {
      await this.$axios.$post('api/v1/webhook-subscriptions', subscription)
    }
  }
}
</script>

<style lang="css" scoped>
</style>
