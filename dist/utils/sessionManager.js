"use strict";
// src/utils/sessionManager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
class SessionManager {
    constructor() {
        this.sessions = new Map();
    }
    // set the state of the session
    setState(chatId, state) {
        const session = this.sessions.get(chatId) || { chatId, state };
        session.state = state;
        this.sessions.set(chatId, session);
    }
    // get the state of the session
    getState(chatId) {
        return this.sessions.get(chatId)?.state || null;
    }
    // set the email of the session
    setEmail(chatId, email) {
        const session = this.sessions.get(chatId) || { chatId, state: 'WAITING_OTP' };
        session.email = email;
        this.sessions.set(chatId, session);
    }
    // get the email of the session
    getEmail(chatId) {
        return this.sessions.get(chatId)?.email || null;
    }
    // set the sid of the session
    setSid(chatId, sid) {
        const session = this.sessions.get(chatId) || { chatId, state: 'WAITING_OTP' };
        session.sid = sid;
        this.sessions.set(chatId, session);
    }
    // get the sid of the session
    getSid(chatId) {
        return this.sessions.get(chatId)?.sid || null;
    }
    setToken(chatId, token) {
        const session = this.sessions.get(chatId) || { chatId, state: 'AUTHENTICATED' };
        session.token = token;
        this.sessions.set(chatId, session);
    }
    // get the token of the session
    getToken(chatId) {
        return this.sessions.get(chatId)?.token || null;
    }
    // check if the user is authenticated
    isAuthenticated(chatId) {
        const session = this.sessions.get(chatId);
        return !!session?.token;
    }
    // set the organization id of the session
    setOrganizationId(chatId, organizationId) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.organizationId = organizationId;
            this.sessions.set(chatId, session);
        }
    }
    // get the organization id of the session
    getOrganizationId(chatId) {
        return this.sessions.get(chatId)?.organizationId || null;
    }
    // clear the session
    clearSession(chatId) {
        this.sessions.delete(chatId);
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map