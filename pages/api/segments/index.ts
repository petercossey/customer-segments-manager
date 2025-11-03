import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next';
import { pino } from 'pino';
import { bigcommerceClient, getSession } from '../../../lib/auth';

/*  node-bigcommerce throws an error if response bodies include an
    'errors' property (https://github.com/getconversio/node-bigcommerce/blob/40b9fb2d948ff0fa2f19d31fbf872754fb6cfe35/lib/request.js#L24-L28)
    So, the batch APIs can't use that client until it's patched.
    I don't want to monkey patch it here, so I'm going to use axios instead
*/

// Use pino-pretty only in development, JSON in production
const logger = pino(
    process.env.NODE_ENV === 'development'
        ? {
            transport: {
                target: 'pino-pretty',
                options: { destination: 1 }
            }
        }
        : {}
)

export default async function segments(req: NextApiRequest, res: NextApiResponse) {
    const {
        body,
        query: { 'id:in': id, page, limit, context },
        method,
    } = req;

    logger.info({ method, query: req.query }, 'Segments API called');

    switch (method) {
        case 'GET': {
            try {
                logger.info('Getting session for segments GET request');
                const session = await getSession(req);

                if (!session) {
                    logger.error('No session found');
                    return res.status(401).json({ message: 'Unauthorized - No session found' });
                }

                const { accessToken, storeHash } = session;
                logger.info({ storeHash }, 'Session retrieved successfully');

                const bigcommerce = bigcommerceClient(accessToken, storeHash);
                const segmentsUrl = `/segments?limit=${limit ? limit : '250'}${page ? `&page=${page}` : ''}${id ? `&id:in=${id}` : ''}`;

                logger.info({ url: segmentsUrl }, 'Fetching segments from BigCommerce');
                const bcRes = await bigcommerce.get(segmentsUrl);

                logger.info({
                    dataCount: bcRes?.data?.length || 0,
                    metaKeys: bcRes?.meta ? Object.keys(bcRes.meta) : []
                }, 'Successfully fetched segments');

                res.status(200).json(bcRes);
            } catch (error) {
                logger.error({ error: error.message, stack: error.stack, response: error.response?.data }, 'Error in segments GET request');
                const { message, response } = error;
                res.status(response?.status || 500).json({ message: message || 'Internal server error' });
            }
            break;
        }
        case 'PUT': {
            try {
                logger.info('Getting session for segments PUT request');
                const { accessToken, storeHash } = await getSession(req);
                logger.info({ storeHash, bodyLength: JSON.stringify(body).length }, 'Updating segments');

                const { data } = await axios({
                    method: 'PUT',
                    url: `https://api.bigcommerce.com/stores/${storeHash}/v3/segments`,
                    data: body,
                    headers: {
                        'X-Auth-Token': accessToken,
                        'Content-Type': "application/json"
                    }
                })
                logger.info('Segments updated successfully');
                res.status(200).json(data)
            } catch (error) {
                logger.error({ error: error.message, response: error.response?.data }, 'Error in segments PUT request');
                const { message, response } = error;
                res.status(response?.status || 500).json({ message: message || 'Internal server error' });
            }
            break;
        }
        case 'POST': {
            try {
                logger.info('Getting session for segments POST request');
                const { accessToken, storeHash } = await getSession(req);
                logger.info({ storeHash, bodyLength: JSON.stringify(body).length }, 'Creating segments');

                const { data } = await axios({
                    method: 'POST',
                    url: `https://api.bigcommerce.com/stores/${storeHash}/v3/segments`,
                    data: body,
                    headers: {
                        'X-Auth-Token': accessToken,
                        'Content-Type': "application/json"
                    }
                })
                logger.info('Segments created successfully');
                res.status(200).json(data)
            } catch (error) {
                logger.error({ error: error.message, response: error.response?.data }, 'Error in segments POST request');
                const { message, response } = error;
                res.status(response?.status || 500).json({ message: message || 'Internal server error' });
            }
            break;
        }
        case 'DELETE': {
            try {
                logger.info('Getting session for segments DELETE request');
                const { accessToken, storeHash } = await getSession(req);
                logger.info({ storeHash, id }, 'Deleting segments');

                const { data } = await axios({
                    method: 'DELETE',
                    url: `https://api.bigcommerce.com/stores/${storeHash}/v3/segments?id:in=${id}`,
                    headers: {
                        'X-Auth-Token': accessToken,
                        'Content-Type': "application/json"
                    }
                })
                logger.info('Segments deleted successfully');
                res.status(200).json(data)
            } catch (error) {
                logger.error({ error: error.message, response: error.response?.data }, 'Error in segments DELETE request');
                const { message, response } = error;
                res.status(response?.status || 500).json({ message: message || 'Internal server error' });
            }
            break;
        }
        default:
            res.setHeader('Allow', ['GET', 'PUT', 'POST', 'DELETE']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }


}
