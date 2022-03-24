<template>
  <v-container>
    <edit-dialog
      :schema="schema"
      @saved="save"
    />
    <v-row>
      <v-col
        v-for="sub in webhookSubscriptions"
        :key="sub._id"
        class="xs"
        xl="2"
        lg="3"
        md="4"
        sm="6"
      >
        <v-card :elevation="4">
          <v-card-title class="title py-2">
            <v-flex
              text-center
              pa-0
            >
              {{ sub.title }}
            </v-flex>
          </v-card-title>
          <v-divider />
          <v-card-text class="px-0 pt-0">
            <v-list>
              <v-list-item dense>
                <v-list-item-content v-if="sub.sender">
                  <span><strong>Émetteur : </strong> {{ sub.sender ? sub.sender.name : 'global' }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Sujet : </strong> {{ sub.topic.title }} ({{ sub.topic.key }})</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Visibilité : </strong> {{ sub.visibility }}</span>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-divider />
          <v-card-actions
            v-if="schema"
            class="py-0"
          >
            <v-spacer />
            <webhook-history-dialog :subscription="sub" />
            <edit-dialog
              :item="sub"
              :schema="schema"
              @saved="save($event, sub)"
            />
            <remove-confirm
              :label="sub.title"
              @removed="remove(sub)"
            />
            <v-spacer />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import eventBus from '~/assets/event-bus'
import EditDialog from '~/components/edit-dialog'
import RemoveConfirm from '~/components/remove-confirm'
const schema = require('../../contract/webhook-subscription.js')

export default {
  components: { EditDialog, RemoveConfirm },
  data: () => ({
    eventBus,
    webhookSubscriptions: null,
    senderSubscriptions: null,
    newSubscription: {},
    schema
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  async mounted () {
    await this.refresh()
  },
  methods: {
    async refresh () {
      this.webhookSubscriptions = (await this.$axios.$get('api/v1/webhook-subscriptions', { params: { owner: this.activeAccount.type + ':' + this.activeAccount.id } })).results
    },
    async save (editedSubscription, previousSubscription) {
      previousSubscription = previousSubscription || {
        sender: this.activeAccount,
        owner: this.activeAccount
      }
      await this.$axios.$post('api/v1/webhook-subscriptions', {
        ...previousSubscription,
        ...editedSubscription
      })
      this.refresh()
    },
    async remove (subscription) {
      await this.$axios.$delete('api/v1/webhook-subscriptions/' + subscription._id)
      this.refresh()
    }
  }
}
</script>

<style lang="css" scoped>
</style>
