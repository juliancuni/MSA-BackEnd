'use strict';

module.exports = function (Perdorues) {
  //TCP Client. Lidhet me Middleware TCP Server
  const Client = require('../MyFuntions/TcpClient');
  /**
     * Kodet e Komandave nga Web
     * 1. Skan_New_Finger (per punonjes te rregjistruar tashme)
     * 2. Reg_New_User
     * 3. Del_User (Fshi fingerprints, attlogs)
     * Kodet e pergigjeve nga ZKTeco + Kanalet ku degjon WebClient (WebSockets)
     * 1. New_Finger_Skanned
     * 2. New_User_Registered
     * 3. User_Deleted
     */
  //MiddleWare per web Client - ZKTeco.
  Perdorues.middleware = function (perdorues, cb) {
    let komandaNgaWeb = ["Skan_New_Finger", "Reg_New_User", "Del_User"];
    let pergjigjeNgaMW = ["New_Finger_Skanned", "New_User_Registered", "User_Deleted"];
    //Kontrollo cfare komande eshte. Nga WebClient, apo nga Middleware;
    perdorues = returnJSON(perdorues);
    if (komandaNgaWeb.indexOf(perdorues.komanda) != -1) {
      //Krijo komande dhe deroje ne MiddleWare
      let komandaPerMW = krijoKomande(perdorues);
      const client = new Client();
      client.sendKomande(JSON.stringify(komandaPerMW))
        .then((tcpDataNgaMW) => {
          //tcpDataNgaMW = JSON.parse(tcpDataNgaMW);
          if (tcpDataNgaMW == "sukses")
            return cb(null, { sukses: true, msg: "Komanda u Dergua ne middleWare. Prisni pergjigjen" })
          else
            return cb(null, { sukses: false, msg: "Komanda nuk u kuptua nga middleware" })
        })
        .catch((err) => {
          console.log(err);
          return cb(null, { sukses: false, msg: err });
        })
      //cb(null, { sukses: true, msg: "Ska pergjigje. Implementoje" })
    } else if (pergjigjeNgaMW.indexOf(perdorues.Komanda) != -1) {
      //Krijo Pergjigje dhe dergoje ne WebClient me WebSocket
      if (perdorues.Sukses) {
        //console.log(perdorues);
        //Perditeso perdoruesin fingerIndex/gishtId (Kujdes. Perdoruesi mund te kete 0 - 9 gishtId. Pra jo me shume se 10 gishta te skanuar);
        Perdorues.findOne({ where: { attId: perdorues.AttId } }, function (err, perd) {
          if (err)
            console.log(err);
          perd.updateAttribute("gishtId", perd.gishtId + 1, function (err, perd) {
            if (err)
              console.log(err);
            //Dergo ne kanalin perkates feedback pozitiv
            Perdorues.app.mx.IO.emit("New_Finger_Skanned", perdorues);
          })
        })
      } else {
        Perdorues.app.mx.IO.emit("New_Finger_Skanned", perdorues);
      }
      cb(null, null)
    } else {

      cb(null, { sukses: false, msg: "Komande e panjohur" })
    }
  }
  //MiddleWare method
  Perdorues.remoteMethod('middleware', {
    accepts: { arg: 'komanda', type: 'object', required: true, http: { source: 'body' } },
    returns: { arg: 'response', type: 'object' },
    description: "Pret dhe percjell komanda per/nga ZKTeco iClock360."
  });

  // //test before and after remote ** all
  Perdorues.afterRemote('**', function (ctx, user, next) {
    let userId = ctx.req.accessToken ? ctx.req.accessToken.userId : user.userId;
    let log = {
      dataOra: new Date(),
      event: ctx.methodString,
      senderId: userId,
      type: "info",
      rolet: ["root", "admin"]
    }
    // Perdorues.app.models.Log.create(log, function(err, log) {
    //   if(err)
    //     Perdorues.app.mx.IO.emit("Kanali_Root", err);
    //   Perdorues.app.mx.IO.emit("Kanali_Evente", log)
    //   // console.log("Logu krijua ", log);
    // })
    next();
  });

  // //test afterError remote ** all
  Perdorues.afterRemoteError('**', function(ctx, next) {
    // if (!ctx.error.details) ctx.error.details = {};
    let userId = ctx.req.accessToken ? ctx.req.accessToken.userId : ctx.req.body;
    // console.log("errrrrrr ++++++++++++++++++++ ", ctx.error.statusCode, ctx.error.code)
    // ctx.error.details.info = 'intercepted by a hook';
    let log = {
      dataOra: new Date(),
      event: ctx.methodString,
      senderId: userId,
      mesazh: ctx.error.statusCode + " : " +ctx.error.code,
      type: "error",
      rolet: ["root"]
    }
    // Perdorues.app.models.Log.create(log, function(err, log) {
    //   if(err)
    //     Perdorues.app.mx.IO.emit("Kanali_Root", err);
    //   Perdorues.app.mx.IO.emit("Kanali_Evente", log)
    //   // console.log("Logu krijua ", log);
    // })
    next();
  });

  //Before Login Shiko per vlefshmerine e username ose password
  Perdorues.beforeRemote('login', function (ctx, modelInstance, next) {
    Perdorues.findOne({ where: { "username": ctx.req.body.username } }, function (err, perdorues) {
      if (err) {
        err = new Error('Fatal ERROR! ' + err);
        err.statusCode = 500;
        err.code = 'FATAL_ERROR';
        next(err);
      }
      if (perdorues) {
        if (perdorues.realm != ctx.req.body.realm) {
          var defaultError = new Error('Token error. Njofto administratorin');
          defaultError.code = 'TOKEN_ERROR';
          defaultError.statusCode = 401;
          next(defaultError);
        } else if(perdorues.enabled) {
          perdorues.hasPassword(ctx.req.body.password, function (err, isMatch) {
            if (err) {
              //handle fatal error ketu
            } else if (!isMatch) {
              var defaultError = new Error('Fjalëkalimi gabim');
              defaultError.statusCode = 401;
              defaultError.code = 'FJALEKALIMI_GABIM';
              next(defaultError);
            } else {
              next();
            }
          })
        } else {
          var defaultError = new Error('Kjo llogari është e bllokuar!');
          defaultError.statusCode = 401;
          defaultError.code = 'LLOGARI_INAKTIVE';
          next(defaultError);
        }
      } else {
        var defaultError = new Error('Ky Përdorues nuk egziston');
        defaultError.statusCode = 401;
        defaultError.code = 'PERDORUES_NUK_EGZISTON';
        next(defaultError);
      }
    });
  });
  //After Login dergo log
  //After save Perdorues Operation hooks
  Perdorues.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      let perdorues = ctx.instance;

      //If PErdorues me MatOret [TODO]

      let komanda = {
        komanda: "Reg_New_User",
        attId: perdorues.attId,
        emer: perdorues.emer,
        mbiemer: perdorues.mbiemer,
        gishtId: perdorues.gishtId,
        privilegjiNePajisje: perdorues.privilegjiNePajisje,
        passNePajisje: perdorues.passNePajisje
      }
      perdorues["komanda"] = "Reg_New_User";
      //TCP_Client Class
      Perdorues.middleware(komanda, function (err, pergjigja) {
        if (err)
          console.log(err)
      })
    }
    next();
  });
  //After delete Perdorues Operation hooks
  Perdorues.observe('before delete', function (ctx, netx) {
    Perdorues.findOne({ where: { id: ctx.where.id.inq[0] } }, function (err, perd) {
      if (err)
        netx(err);

      if (perd) {
        let komanda = {
          komanda: "Del_User",
          attId: perd.attId,
          emer: perd.emer,
          mbiemer: perd.mbiemer,
          gishtId: perd.gishtId,
          privilegjiNePajisje: perd.privilegjiNePajisje,
          passNePajisje: perd.passNePajisje
        }
        // console.log(komanda);
        Perdorues.middleware(komanda, function (err, pergjigja) {
          if (err) {
            err.statusCode = 400;
            netx(err);
          }
        })
      }
    })
    netx();
  })
  //Krijo komande function
  var krijoKomande = (perdroues) => {
    let komandaObj = {
      komanda: perdroues.komanda,
      attId: perdroues.attId,
      emerIplote: perdroues.emer + " " + perdroues.mbiemer,
      gishtId: perdroues.gishtId + 1,
      privilegji: perdroues.privilegjiNePajisje,
      password: perdroues.passNePajisje
    }
    return komandaObj;
  }
  //Kontrollo nese eshte JSON
  function returnJSON(obj) {
    if (obj !== undefined && obj !== null && obj.constructor == Object) {
      return obj;
    } else {
      return JSON.parse(obj);
    }
  }
};





  // app.on('started', function () {
  //   app.mx.IO.on("Hap_Skan_Finger_komande_nga_web", function(objNgaWeb) {
  //     console.log(objNgaWeb);
  //     var emerIPlote = objNgaWeb.emer + " " + objNgaWeb.mbiemer;
  //     var gishtId = objNgaWeb.gishtId + 1;
  //     var hapSkan = {
  //       "komanda": "Hap_Skan_Finger",
  //       "userId": objNgaWeb.attId,
  //       "gishtId": gishtId
  //     };
  //     //dergo Komanden ne pajisje Hap_Skan_Finger
  //     client.write(JSON.stringify(hapSkan));


  //   });
  // });
  // Perdorues.app.mx.IO.emit('pergjigje_nga_FP_Skanner', "pergjigje_nga_FP_Skanner");

  //Degjo per komanda nga web
  // Perdorues.app.mx.IO.on("Hap_Skan_Finger_komande_nga_web", function(objNgaWeb) {
  //   var emerIPlote = perd.emer + " " + perd.mbiemer;
  //   var gishtId = perd.gishtId + 1;
  //   var hapSkan = {
  //     "komanda": "Hap_Skan_Finger",
  //     "userId": perd.attId,
  //     "gishtId": gishtId
  //   };
  //   //dergo Komanden ne pajisje Hap_Skan_Finger
  //   client.write(JSON.stringify(hapSkan));
  // })

  //Custom method per SkanGisht
  // Perdorues.skanoGisht = function(perd, cb) {
  //   cb(null, 'Skan... ');
  // }
  // Perdorues.remoteMethod('skanoGisht', {
  //       accepts: {arg: 'perd', type: 'object'},
  //       returns: {arg: 'finger', type: 'string'}
  // });

      // //Dergo komande ne TimeATT service. TimeATT pastaj e perpunon dhe i dergon komande ZKTeco.
      // client.sendKomande(JSON.stringify(komanda))
      //   .then((data) => {
      //     //   //Vjen callback nga ZKTeco, perpunoje dhe kthe callback ne web,
      //     //   //Convert data toString()
      //     data = data.toString();
      //     //   //Convert data to JSON
      //     data = JSON.parse(data);
      //     //   //Send callback to web
      //     return cb(null, data);
      //   })
      //   .catch((err) => {
      //     //Kap error dhe jep arsyen pse deshtoi
      //     return cb(null, err);
      //   })