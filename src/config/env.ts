import Joi from 'joi';

type Env = {
  PORT: string;
  NODE_ENV: string;
  REDIS_URL: string;
};

const { value: env, error } = Joi.object<Env>()
  .keys({
    PORT: Joi.string(),
    NODE_ENV: Joi.string(),
    REDIS_URL: Joi.string(),
  })
  .unknown()
  .validate(process.env);

if (error) throw error;

export default env as Env;
