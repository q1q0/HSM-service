import * as express from 'express';
import {HsmWalletService} from '../services/SecurityModuleService';

export function hsmWalletRoutes(app: express.Application): express.Router {
  const router = app.get('router');
  router.post('/generate', (req: express.Request, res: express.Response) => {
    HsmWalletService.instance.generate()
        .then(ecPoint => {
          return res.status(200).send({'ecPoint': ecPoint});
        })
        .catch(error => {
          console.log(error);
          return res.status(500).send(error);
        });
  });

  router.post('/sign', (req: express.Request, res: express.Response) => {
    const {ecPoint, message} = req.body;

    HsmWalletService.instance.sign(ecPoint, message)
        .then(([a, b]) => {
          return res.status(200).send({r: a, s: b});
        })
        .catch(error => {
          console.log(error);
          return res.status(500).send(error);
        });
  });

  return router;
}
