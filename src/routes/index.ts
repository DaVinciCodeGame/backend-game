import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.status(200).send('do u want some game'));

export default router;
