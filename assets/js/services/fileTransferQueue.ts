import Queue from '../asset/Queue'

/* Queue that ensures one file transfer at a time.  */

export const queue = new Queue(1);
queue.start();
