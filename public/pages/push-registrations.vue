<template>
  <v-container>
    <v-row class="ma-0">
      <register-device @register="refresh" />
    </v-row>
    <edit-dialog :schema="schema" @saved="push" />
    <v-row v-if="registrations">
      <v-col
        v-for="(registration, i) in registrations"
        :key="i" class="xs" xl="2" lg="3" md="4"
        sm="6"
      >
        <v-card :elevation="4" :disabled="registration.disabled || registration.disabledUntil">
          <template>
            <v-card-title class="title py-2">
              <v-flex text-center pa-0>
                {{ registration.deviceName }}
              </v-flex>
            </v-card-title>
            <v-divider />
          </template>
          <v-card-text class="px-0 pt-0">
            <v-list>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Date : </strong> {{ registration.date | date }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Type : </strong> {{ registration.type }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item dense>
                <v-list-item-content>
                  <span><strong>Id : </strong> {{ registration.id }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="registration.lastSuccess" dense>
                <v-list-item-content>
                  <span><strong>Derrnier envoi réussi</strong> {{ registration.lastSuccess | date }}</span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="registration.disabled === 'gone'" dense>
                <v-list-item-content>
                  <span><strong>Désactivé</strong></span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="registration.disabled === 'errors'" dense>
                <v-list-item-content>
                  <span><strong>Désactivé pour cause d'erreurs en série</strong></span>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="registration.disabledUntil" dense>
                <v-list-item-content>
                  <span><strong>Désactivé temporairement pour cause d'erreur (jusqu'à {{ registration.disabledUntil | date }})</strong></span>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-divider />
          <v-card-actions class="py-0">
            <v-spacer />
            <edit-dialog :item="registration" :schema="schema" @saved="save($event, i)" />
            <remove-confirm :label="registration.deviceName" @removed="remove(i)" />
            <v-spacer />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import RegisterDevice from '~/components/register-device'
import EditDialog from '~/components/edit-dialog'
import RemoveConfirm from '~/components/remove-confirm'

export default {
  components: { RegisterDevice, EditDialog, RemoveConfirm },
  data () {
    return {
      registrations: null,
      schema: {
        type: 'object',
        properties: {
          deviceName: {
            type: 'string',
            title: 'Nom de l\'appareil',
            description: 'Déterminé automatiquement à partir du user-agent si laissé vide'
          },
          type: {
            type: 'string',
            title: 'Type d\'appareil',
            default: 'webpush',
            oneOf: [
              { const: 'webpush', title: 'Navigateur' },
              { const: 'apn', title: 'Apple' }
            ]
          },
          id: {
            type: 'string',
            title: 'Identifiant d\'abonnement',
            description: 'Dépend du type d\'appareil, peut contenir un objet JSON'
          }
        }
      }
    }
  },
  async created () {
    this.refresh()
  },
  methods: {
    async refresh () {
      this.registrations = await this.$axios.$get('api/v1/push/registrations')
      this.registrations.forEach(r => {
        if (r.type === 'webpush') r.id = JSON.stringify(r.id)
      })
    },
    fixRegistration (registration) {
      const obj = { ...registration }
      if (obj.type === 'webpush') obj.id = JSON.parse(obj.id)
      return obj
    },
    async push (registration) {
      await this.$axios.$post('api/v1/push/registrations', this.fixRegistration(registration))
      await this.refresh()
    },
    async saveRegistrations () {
      await this.$axios.$put('api/v1/push/registrations', this.registrations.map(r => this.fixRegistration(r)))
      await this.refresh()
    },
    async remove (i) {
      this.registrations.splice(i, 1)
      await this.saveRegistrations()
    },
    async save (registration, i) {
      this.registrations[i] = registration
      await this.saveRegistrations()
    }
  }
}
</script>

<style lang="css" scoped>
</style>
