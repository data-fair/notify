<template>
  <v-container>
    <edit-dialog :schema="schema" @saved="save" />
    <v-row>
      <v-col
        v-for="sub in recipientSubscriptions"
        :key="sub._id" class="xs" xl="2" lg="3" md="4"
        sm="6"
      >
        <v-card :elevation="4">
          <template>
            <v-card-title class="title py-2">
              <v-flex text-center pa-0>
                {{ sub.title }}
              </v-flex>
            </v-card-title>
            <v-divider />
          </template>
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
                  <span><strong>Destinataire : </strong> {{ sub.recipient.name }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Sorties : </strong> {{ sub.outputs && sub.outputs.join(', ') }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="sub.locale" dense>
                <v-list-item-content>
                  <span><strong>Locale : </strong> {{ sub.locale }}</span>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-divider />
          <v-card-actions v-if="schema" class="py-0">
            <v-spacer />
            <edit-dialog :item="sub" :schema="schema" @saved="save($event, sub)" />
            <remove-confirm :label="sub.title" @removed="remove(sub)" />
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
const schemaBuilder = require('../../contract/subscription.js')

export default {
  components: { EditDialog, RemoveConfirm },
  data: () => ({
    eventBus,
    recipientSubscriptions: null,
    senderSubscriptions: null,
    newSubscription: {}
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount']),
    schema () {
      const schema = JSON.parse(JSON.stringify(schemaBuilder(process.env.i18n.locales.split(','))))
      Object.keys(schema.properties).forEach(k => {
        if (schema.properties[k].readOnly) delete schema.properties[k]
      })
      return schema
    }
  },
  async mounted () {
    await this.refresh()
  },
  methods: {
    async refresh () {
      this.recipientSubscriptions = (await this.$axios.$get('api/v1/subscriptions', { params: { recipient: this.user.id } })).results
      // this.senderSubscriptions = (await this.$axios.$get('api/v1/subscriptions', { params: { senderType: this.activeAccount.type, senderId: this.activeAccount.id } })).results
    },
    async save (editedSubscription, previousSubscription) {
      previousSubscription = previousSubscription || {
        sender: this.activeAccount,
        recipient: { id: this.user.id, name: this.user.name }
      }
      await this.$axios.$post('api/v1/subscriptions', {
        ...previousSubscription,
        ...editedSubscription
      })
      this.refresh()
    },
    async remove (subscription) {
      await this.$axios.$delete('api/v1/subscriptions/' + subscription._id)
      this.refresh()
    }
  }
}
</script>

<style lang="css" scoped>
</style>
