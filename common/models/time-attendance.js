'use strict';
//var app = require('../../server/server');
module.exports = function (Timeattendance) {
    /**
     * TimeAttendance Remote_Reg nga pajisja ne BackEndServer
     * Pasi vjen kerkesa nga pajisja;
     * 1. kontrollo nese ka bere checkin sot. (Nga ora 00 deri ne oren aktuale)                         GO!
     * 2. Nese nuk ka bere checkin, bej checkin te ri per kete perdorues dhe dergo pergjigje.           STOP!
     * 3. Nese ka bere chekin atehere kontrollo nese ka checkout.                                       GO!
     * 4. Nese ka checkout dergo pergjigje "Emer Mbiemer ka bere checkout per sot!"                     STOP!
     * 5. Nese ska bere checkout atehere kontrollo nese ka te pakten 4 ore ne pune.                     GO!
     * 6. Nese ka 4 ore ne pune atehere bej checkout dhe dergo pergjigje.                               STOP!
     * 7. Nese ska 4 ore ne pune atehere dergo pergjigje "Emer Mbiemer ka bere checkin per sot!"        STOP!
     */

    Timeattendance.remote_reg = function (attId, cb) {
        var perdorues = Timeattendance.app.models.Perdorues;
        perdorues.findOne({ where: { attId: attId } }, function (err, Perd) {
            if (err) {
                cb(null, err);
                return;
            }
            var dataSotNeOren0 = new Date(new Date().setHours(0, 0, 0, 0));
            var dataOraTani = new Date();
            //Zgjidh checkin per kete user per sot
            Timeattendance.findOne({ where: { and: [{ attId: String(attId) }, { checked_in: { between: [dataSotNeOren0, dataOraTani] } }] } }, function (err, timeAtt) {
                if (err) {
                    cb(null, err);
                    return;
                }
                //Nese ka bere checkin sot 
                if (timeAtt) {
                    //Nese ka bere dhe checkout
                    if (timeAtt.checked_out) {
                        cb(null, "WARNING: " + Perd.emer + " " + Perd.mbiemer + " ka bere Check_out per sot. Stop!");
                    } else {
                        //Nese ska bere checkout kontrollo a e ka plotesuar kushtin per 4 ore ne pune?
                        //Ora e checkinit + 4. 
                        var checkedInDataOraPlus4 = new Date(timeAtt.checked_in);
                        checkedInDataOraPlus4.setHours(checkedInDataOraPlus4.getHours() + 4);
                        //Nese ka te pakten 4 ore nga checkin
                        if (checkedInDataOraPlus4 <= dataOraTani) {
                            //Nese ka 4 ore qe ka bere checkin atehere bej checkout
                            //Perditeso PErdoruesin
                            Perd.checkedIn = false;
                            Perd.check_out = dataOraTani;
                            perdorues.upsert(Perd, function (err, perd) {
                                if (err) {
                                    cb(null, err);
                                    return;
                                }
                                timeAtt.checked_out = dataOraTani;
                                //Tani mund te besh checkout
                                Timeattendance.upsert(timeAtt, function (err, timeAtt) {
                                    if (err) {
                                        cb(null, err);
                                        return;
                                    }
                                    //Dergo me websocket nnjoftim ne webclient
                                    var mesazh = {attId: attId, checkOut: 1, check_out: timeAtt.checked_out};
                                    Timeattendance.app.mx.IO.emit('enroll_gisht', mesazh);
                                    //Dergo pergjigje per checkout me sukses
                                    cb(null, "INFO: " + Perd.emer + " " + Perd.mbiemer + " Checked Out " + timeAtt.checked_out);
                                })
                            })

                        } else {
                            //Stop. Perdoruesi ka bere cheking per sot!
                            cb(null, "WARNING: " + Perd.emer + " " + Perd.mbiemer + " ka bere Check_In per sot. Stop!");
                        }
                    }
                } else {
                    //Bej checkin te ri
                    var newTimeAtt = { attId: String(attId), checked_in: dataOraTani };
                    Timeattendance.create(newTimeAtt, function (err, timeAtt) {
                        if (err) {
                            cb(null, err);
                            return;
                        }
                        //Dergo me websocket nnjoftim ne webclient
                        var mesazh = {attId: attId, checkOut: 0, check_in: timeAtt.checked_in};
                        Timeattendance.app.mx.IO.emit('enroll_gisht', mesazh);
                        //Dergo pergjigje per checkin me sukses
                        cb(null, "INFO: " + Perd.emer + " " + Perd.mbiemer + " Checked In " + timeAtt.checked_in);
                    })
                    ///Perditeso PErdoruesin
                    Perd.checkedIn = true;
                    Perd.check_in = dataOraTani;
                    perdorues.upsert(Perd, function (err, perd) {
                        if (err) {
                            cb(null, err);
                            return;
                        }
                    })
                }
                //Perditeso Perdoruesin Pas kushteve

            })
        })
    }

    Timeattendance.remoteMethod('remote_reg', {
        accepts: { arg: 'userAttId', type: 'number' },
        returns: { arg: 'pergjigje', type: 'string' },
        description: "Remote insert nga TimeAtt_Service [Time Attendances]"
    });
};















            // //Kontrollo nese ka bere checkin
            // //Kontrollo nese checkini eshte bere sot midis ores 7 te mengjesit dhe ores 12 ne dreke

            // dataSotMeMesdite.setTime
            // Timeattendance.findOne({ where: { and: [{ attId: String(attId) }, { checked_in: { between: [dataSotNeMengjes, dataSotMeMesnate] } }] } }, function (err, timeAtt) {
            //     if (err) {
            //         cb(null, err);
            //         return;
            //     }
            //     //Nese ka checkin sot midis orarit te parashikuar, atehere bej checkOut
            //     if (timeAtt && new Date > dataSotMeMesdite) {
            //         Perd.checkedIn = false;
            //         //Update Perdorues checkedin = false
            //         perdorues.upsert(Perd, function (err, Perd) {
            //             if (err) {
            //                 cb(null, err);
            //                 return;
            //             }
            //             timeAtt.checked_out = new Date();
            //             //Update TimeAtt checkedOut data ora tani 
            //             Timeattendance.upsert(timeAtt, function (err, timeAtt) {
            //                 if (err) {
            //                     cb(null, err);
            //                     return;
            //                 }
            //                 cb(null, Perd.emer + " " + Perd.mbiemer + " Checked Out");
            //             })
            //         })

            //     } else {
            //         //Nese jo bej checkin te ri
            //         Perd.checkedIn = true;
            //         perdorues.upsert(Perd, function (err, Perd) {
            //             if (err) {
            //                 cb(null, err);
            //                 return;
            //             }
            //             Timeattendance.create({ attId: attId, checked_in: new Date() }, function (err, timeAtt) {
            //                 if (err) {
            //                     cb(null, err);
            //                     return;
            //                 }
            //                 cb(null, Perd.emer + " " + Perd.mbiemer + " Checked In");
            //             })
            //         })
            //     }
            // });