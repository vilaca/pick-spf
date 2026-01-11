// Jest setup file - runs before all tests
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder and TextDecoder for JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
