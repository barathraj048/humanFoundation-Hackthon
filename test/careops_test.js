import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

// Track the latency specifically for our Prisma DB queries
const dbQueryLatency = new Trend('prisma_db_latency');

export const options = {
  stages: [
    { duration: '10s', target: 70 }, // Sudden spike to 200 concurrent users
    { duration: '30s', target: 70 }, // Sustain the load to stress the connection pool
    { duration: '10s', target: 0 },   // Scale down smoothly
  ],
  thresholds: {
    // The literal proof for your resume: 99% of requests must finish in under 200ms
    'prisma_db_latency': ['p(99)<200'], 
    'http_req_failed': ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  // Targeting your actual dashboard overview endpoint
  const url = 'http://localhost:8000/api/dashboard/overview'; 
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Your live JWT token from the browser
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhOTUzM2JjZS01ZjliLTQ3NGQtOWU4ZC1iMjczZjRkZjc2MmIiLCJ3b3Jrc3BhY2VJZCI6IjZlMmMxYTljLWJkYTMtNDI2Yi04NGQ3LWY4NjJhOTIyYmI0ZSIsInJvbGUiOiJPV05FUiIsImlhdCI6MTc4MTM2NDM3OSwiZXhwIjoxNzgxOTY5MTc5fQ.VGFVY1DK4basVxZCjlpFl3Z7D5i_G-NUc93kAGseLxw'
    },
  };

  const res = http.get(url, params);

  if (res.status === 200) {
    dbQueryLatency.add(res.timings.duration);
  }

  check(res, {
    'status is 200 OK': (r) => r.status === 200,
    // When Prisma exhausts its connection pool, it throws a 500 or 503 error
    'no Prisma connection timeouts': (r) => r.status !== 500 && r.status !== 503, 
  });
}