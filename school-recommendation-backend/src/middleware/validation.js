const Joi = require('joi');

const validationSchemas = {
    createYear: Joi.object({
        year: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
            .messages({
                'string.pattern.base': 'Year must be in format YYYY-YYYY'
            })
    }),

    importStudents: Joi.object({
        academicYearId: Joi.number().integer().optional()
    }),

    calculateRecommendation: Joi.object({
        academicYearId: Joi.number().integer().optional()
    })
};

function validate(schemaName) {
    return (req, res, next) => {
        const schema = validationSchemas[schemaName];
        if (!schema) {
            return next();
        }

        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        next();
    };
}

module.exports = validate;