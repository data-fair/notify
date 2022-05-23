<template>
  <v-container>
    <edit-dialog
      :schema="schema"
      @saved="save"
    />
    <v-row>
      <v-col
        v-for="topic in topics"
        :key="topic._id"
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
              {{ topic.title }}
            </v-flex>
          </v-card-title>
          <v-divider />
          <v-card-text class="px-0 pt-0">
            <v-list>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Clé</strong> {{ topic.key }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Propriétaire</strong> {{ topic.owner.name }}</span>
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
            <edit-dialog
              :item="topic"
              :schema="schema"
              @saved="save($event, topic)"
            />
            <remove-confirm
              :label="topic.title"
              @removed="remove(topic)"
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
const schema = require('../../../contract/topic.js')()
schema.properties.owner.readOnly = false
schema.properties.owner.title = ''
delete schema.properties.owner.properties.id
delete schema.properties.owner.properties.name
schema.properties.owner.properties.type.title = 'Type de comptes'
Object.keys(schema.properties).forEach(k => {
  if (schema.properties[k].readOnly) delete schema.properties[k]
})

export default {
  components: { EditDialog, RemoveConfirm },
  data: () => ({
    eventBus,
    schema,
    topics: null,
    newTopic: {}
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
      this.topics = (await this.$axios.$get('api/v1/topics', { params: { global: true } })).results.filter(t => t.owner.id === '*')
    },
    async save (editedTopic, previousTopic) {
      previousTopic = previousTopic || {}
      editedTopic.owner.id = '*'
      editedTopic.owner.name = editedTopic.owner.type === 'user' ? 'Tous les utilisateurs' : 'Toutes les organisations'
      await this.$axios.$post('api/v1/topics', {
        ...previousTopic,
        ...editedTopic
      })
      this.refresh()
    },
    async remove (topic) {
      await this.$axios.$delete('api/v1/topics/' + topic._id)
      this.refresh()
    }
  }
}
</script>

<style lang="css" scoped>
</style>
