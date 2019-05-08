'use strict';

module.exports = (Log) => {

    Log.observe('access', function (ctx, next) {

        let userId = ctx.options.accessToken.userId;
        // var RoleMapping = Log.app.models.RoleMapping;
        // Log.app.models.Role.getRoles({principalType: RoleMapping.USER, principalId: userId}, function(err, rolet){
        //     if(err) console.log(err)
        //     console.log(rolet);
        // })

        // Log.app.models.Role.getRoles({principalType: RoleMapping.USER, principalId: userId}, function(err, roles) {
        //     console.log(roles);  // everyone, authenticated, etc (hopefully)
        // });

        Log.app.models.Perdorues.find({include: "rolet"}, function (err, perdorues) {
            if (err)
                console.log(err);
            console.log(perdorues[0])
        })


        // let userId = ctx.options.accessToken.userId;
        // Log.app.models.Perdorues.findOne({where: {userId: userId}}, function(err, Perdorues) {})
        // Log.app.models.Role.isInRole("admin", ctx, function(err, isInRole) {
        //     console.log(isInRole);
        // }) 
        next();
    })

    Log.observe('before save', (ctx, next) => {
        // const token = ctx.options && ctx.options.accessToken;
        // const userId = token && token.userId;
        // const user = userId ? 'user#' + userId : '<anonymous>';
        // const modelName = ctx.Model.modelName;
        // const scope = ctx.where ? JSON.stringify(ctx.where) : '<all records>';
        // console.log('%s: %s accessed %s:%s', new Date(), user, modelName, scope);
        // console.log(ctx)
        next();
    })  



};
