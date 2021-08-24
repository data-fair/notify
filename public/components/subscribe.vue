<template>
  <v-col class="py-0 px-1">
    <v-subheader class="px-0 my-2" style="height: auto;">
      {{ $t('pages.subscribe.notifyMe', {title: topic.title}) }}
    </v-subheader>
    <v-row v-if="subscription">
      <v-col class="py-0">
        <v-switch
          v-model="subscription.outputs" dense hide-details class="mt-0 mb-1" :label="$t('pages.subscribe.notification')"
          value="web"
          @change="patch"
        />
      </v-col>
      <v-col class="pt-0 pb-2">
        <v-switch
          v-model="subscription.outputs" dense hide-details class="mt-0 mb-1" :label="$t('pages.subscribe.email')"
          value="email" @change="patch"
        />
      </v-col>
    </v-row>
    <v-progress-circular v-else indeterminate size="20" color="primary" />
  </v-col>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  props: {
    topic: { type: Object, default: null },
    noSender: { type: Boolean, default: false }
  },
  data: () => ({
    subscription: null
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
      if (!this.subscription) {
        this.subscription = {
          recipient: { id: this.user.id, name: this.user.name },
          topic: this.topic,
          outputs: []
        }
        if (!this.noSender) {
          this.subscription.sender = this.activeAccount
        }
      }
      this.subscription.locale = this.$i18n.locale
    },
    async patch () {
      if (this.subscription.outputs.length) {
        await this.$axios.$post('api/v1/subscriptions', this.subscription)
      } else if (this.subscription._id) {
        await this.$axios.$delete('api/v1/subscriptions/' + this.subscription._id)
      }
      this.refresh()
    }
  }
}
</script>

<style lang="css" scoped>
</style>
