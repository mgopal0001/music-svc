const Joi = require('joi');

class ArtistValidation{
    static validateGetArtists = (args) => {
        const { pageSize, ...rest } = args;
        const schema = Joi.object({
            offset: Joi.alternatives([
                Joi.string().pattern(new RegExp('^[0-9]$')),
                Joi.number().integer().min(0)
            ]),
            size: Joi.ref('offset')
        });

        let {offset, size} = Joi.attempt(rest, schema);

        return { 
            skip: parseInt(offset.toString()), 
            limit: parseInt(size.toString()) > pageSize ? pageSize : parseInt(size.toString()) 
        };
    }

    static validateGetTopArtists = (args) => {
        const { pageSize, ...rest } = args;
        const schema = Joi.object({
            size: Joi.alternatives([
                Joi.string().pattern(new RegExp('^[0-9]$')),
                Joi.number().integer().min(0)
            ])
        });

        let { size } = Joi.attempt(rest, schema);

        return { 
            limit: parseInt(size.toString()) > pageSize ? pageSize : parseInt(size.toString()) 
        };
    }
}

module.exports = {
    ArtistValidation
};