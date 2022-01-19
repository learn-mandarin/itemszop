import app from './lib/app.js'
import admin from './lib/admin.js'
import axios from 'axios'
import { Rcon } from 'rcon-client'

class PrzelewVerification {
  constructor () {
    this.db = admin.database().ref()
    return (req, res) => {
      this.check(req, res)
    }
  }
  check (req, res) {
    this.req = req
    this.res = res
    const [shopid, service, nick] = req.control.split('|')
    this.shopid = shopid
    this.serviceId = serviceId
    this.nick = nick
    this.checkIp()
  }
  checkIp () {
    const ip = this.req.headers['x-forwarded-for'] || this.req.socket.remoteAddress
    axios.get('https://microsms.pl/psc/ips/').then((response) => {
      if (response.data.split(',').includes(ip) && status) {
        this.checkUserId()
      } else {
        this.error()
      }
    })
  }
  checkUserId () {
    const {userid} = this.req.query
    this.db.child(`shops/${this.shopid}/payments/paymentsUserId`).once('value', (snapshot) => {
      if (snapshot.exists() && snapshot.val() === userid) {
        this.checkService()
      } else {
        this.error()
      }
    })
  }
  checkService () {
    this.db.child(`shops/${this.shopid}/services/${this.serviceId}`).once('value', (snapshot)=>{
      if(snapshot.exists()){
        this.service=snapshot.val()
        this.checkServer()
      }else{
        this.error()
      }
    })
  }
  checkServer(){
    this.db.child(`servers/${this.service.server}`).once('value', (snapshot)=>{
      if(snapshot.exists()){
        this.server=snapshot.val()
        this.checkRcon()
      }else{
        this.error()
      }
    })
  }
  checkRcon(){
    let count = 0
    const commands = this.service.commands.split('\n')
    for (let command of commands) {
      command = command.replace(/\[nick\]/g, this.nick)
      const config = {
        host: this.server.serverIp,
        port: this.server.serverPort,
        password: this.server.serverPassword
      }
      Rcon.connect(config).then((rcon) => {
        rcon.send(command)
          .then((response) => {
            count++
            if (count === commands.length) {
              this.success()
            }
          })
          .catch((e) => {
            this.error()
          })
      }).catch((e) => {
        this.error()
      })
    }
  }
  error () {
    this.res.send('ERR')
  }
  success () {
    this.res.send('OK')
  }
}

app.get('/api/przelew', new PrzelewVerification())

module.exports = app
