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

    static validateDeleteArtist = (args) => {
        const schema = Joi.object({
            artistId: Joi.string()
        });

        return Joi.attempt(args, schema);
    }

    static validateUpdateArtist = (args) => {
        const schema = Joi.object({
            artistId: Joi.string().required(),
            artistName: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[\s]{1, 1})+{3, 20}$')).allow(null).optional(),
            dateOfBirth: Joi.date().raw().allow(null).optional(),
            image: Joi.object({
                mimetype: Joi.string().valid(['image/jpeg']),
                size: Joi.number().integer().min(1024).max(1024 * 1024),
                buffer: Joi.any()
            }).allow(null).optional()
        }).or('artistName', 'dateOfBirth', 'image');

        return Joi.attempt(args, schema);
    }

    static validateUploadArtist = (args) => {
        const schema = Joi.object({
            artistName: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[\s]{1, 1})+{3, 20}$')).required(),
            dateOfBirth: Joi.date().raw().required(),
            image: Joi.object({
                mimetype: Joi.string().valid(['image/jpeg']).required(),
                size: Joi.number().integer().min(1024).max(1024 * 1024).required(),
                buffer: Joi.any().required()
            }).required()
        });

        return Joi.attempt(args, schema);
    }
}

class SongValidation {
    static validateRateSong = (args) => {
        const schema = Joi.object({
            songId: Joi.string().required(),
            userRating: Joi.number().integer().min(1).max(5).required()
        });

        return Joi.attempt(args, schema);
    }

    static validateDeleteSong = (args) => {
        const schema = Joi.object({
            songId: Joi.string().required()
        });

        return Joi.attempt(args, schema);
    }

    static validateUpdateSong = (args) => {
        const schema = Joi.object({
            songId: Joi.string().required(),
            songTitle: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[-\s]{1, 1})+{3, 20}$')).allow(null).optional(),
            dateOfRelease: Joi.date().raw().allow(null).optional(),
            image: Joi.object({
                mimetype: Joi.string().valid(['image/jpeg']),
                size: Joi.number().integer().min(1024).max(1024 * 1024),
                buffer: Joi.any()
            }).allow(null).optional(),
            artistsToAdd: Joi.array().items(Joi.string()).default([]),
            artistsToDelete: Joi.ref('artistsToAdd')
        }).or('songTitle', 'dateOfRelease', 'image', 'artistsToAdd', 'artistsToDelete');

        return Joi.attempt(args, schema);
    }

    static validateUploadSong = (args) => {
        const schema = Joi.object({
            songName: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[-\s]{1, 1})+{3, 20}$')).required(),
            dateOfRelease: Joi.date().raw().required(),
            artistIds: Joi.array().items(Joi.string()).default([]),
            image: Joi.object({
                mimetype: Joi.string().valid(['image/jpeg']).required(),
                size: Joi.number().integer().min(1024).max(1024 * 1024).required(),
                buffer: Joi.any().required()
            }).required(),
            audio: Joi.object({
                mimetype: Joi.string().valid(['audio/mp4']).required(),
                size: Joi.number().integer().min(1024).max(10 * 1024 * 1024).required(),
                buffer: Joi.any().required()
            }).required()
        });

        return Joi.attempt(args, schema);
    }
}

class UserValidation{
    static validateUpdateUser = (args) => {
        const schema = Joi.object({
            fullName: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[\s]{1, 1})+{3, 20}$')).required()
        });

        return Joi.attempt(args, schema);
    }
}

class AuthValidation{
    static validateLogin = (args) => {
        const schema = Joi.object({
            email: Joi.string().email().required()
        });

        return Joi.attempt(args, schema);
    }

    static validateSignup = (args) => {
        const schema = Joi.object({
            fullName: Joi.string().pattern(new RegExp('^([a-zA-Z]{1, 10}[\s]{1, 1})+{3, 20}$')).required(),
            email: Joi.string().email().required(),
            adminSecret: Joi.string()
        });

        return Joi.attempt(args, schema);
    }

    static validateSendOTP = (args) => {
        const schema = Joi.object({
            email: Joi.string().email().required()
        });

        return Joi.attempt(args, schema);
    }

    static validateVerifyOTP = (args) => {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            otp: Joi.string().pattern(new RegExp('^[0-9]{6, 6}$')).required()
        });

        return Joi.attempt(args, schema);
    }
}

module.exports = {
    ArtistValidation,
    UserValidation,
    AuthValidation,
    SongValidation
};