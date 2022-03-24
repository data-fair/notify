<template>
  <v-list flat>
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="loading"
        stream
        height="4"
        style="margin:0;"
      />
    </div>
    <v-btn
      icon
      absolute
      right
      top
      @click="refresh"
    >
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
    <template v-if="webhooks">
      <webhook-history-item
        v-for="(webhook) in webhooks.results"
        :key="webhook._id"
        :webhook="webhook"
        @refresh="refresh"
      />
    </template>
  </v-list>
</template>

<script>
import webhookHistoryItem from './webhook-history-item.vue'

export default {
  components: { webhookHistoryItem },
  props: {
    subscription: { type: Object, default: null }
  },
  data () {
    return {
      loading: false,
      webhooks: null
    }
  },
  async mounted () {
    await this.refresh()
  },
  methods: {
    async refresh () {
      this.loading = true
      this.webhooks = await this.$axios.$get('api/v1/webhooks', {
        params: {
          subscription: this.subscription._id,
          size: 100
        }
      })
      this.loading = false
    }
  }
}
</script>

<style>

</style>
