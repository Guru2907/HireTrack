jest.mock('jsonwebtoken');
jest.mock('../../models/User');

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const protect = require('../protect');

describe('protect middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('rejects a request with no Authorization header', async () => {
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a malformed Authorization header', async () => {
    req.headers.authorization = 'sometoken123';
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid or expired token', async () => {
    req.headers.authorization = 'Bearer badtoken';
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches req.user and calls next() for a valid token', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 'user123' });
    const fakeUser = { _id: 'user123', name: 'Sam' };
    User.findById.mockResolvedValue(fakeUser);

    await protect(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});