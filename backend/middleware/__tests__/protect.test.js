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
    const select = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select });

    await protect(req, res, next);

    expect(select).toHaveBeenCalledWith('-password -resumes');
    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });

  test('rejects a valid token whose user no longer exists', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 'deleted123' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // A 401 makes the frontend log the user out, so an outage must surface as a server error instead.
  test('passes a database failure to the error handler instead of answering 401', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 'user123' });
    const dbError = Object.assign(new Error('connection refused'), { name: 'MongoNetworkError' });
    User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(dbError) });

    await protect(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(dbError);
    expect(req.user).toBeUndefined();
  });

  test('a token carrying a malformed user id is still a 401', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 'not-an-object-id' });
    const castError = Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' });
    User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(castError) });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});