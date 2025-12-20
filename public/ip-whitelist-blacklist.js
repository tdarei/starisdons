/**
 * IP Whitelisting/Blacklisting
 * IP address management
 */

class IPWhitelistBlacklist {
    constructor() {
        this.whitelist = [];
        this.blacklist = [];
        this.init();
    }
    
    init() {
        this.loadLists();
        this.checkIP();
    }
    
    loadLists() {
        try {
            const saved = localStorage.getItem('ip-lists');
            if (saved) {
                const data = JSON.parse(saved);
                this.whitelist = data.whitelist || [];
                this.blacklist = data.blacklist || [];
            }
        } catch (e) {
            console.warn('Failed to load IP lists:', e);
        }
    }
    
    async getCurrentIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (e) {
            return null;
        }
    }
    
    async checkIP() {
        const ip = await this.getCurrentIP();
        if (ip) {
            if (this.blacklist.includes(ip)) {
                alert('Access denied from this IP address');
                return false;
            }
        }
        return true;
    }
    
    addToWhitelist(ip) {
        if (!this.whitelist.includes(ip)) {
            this.whitelist.push(ip);
            this.saveLists();
        }
    }
    
    addToBlacklist(ip) {
        if (!this.blacklist.includes(ip)) {
            this.blacklist.push(ip);
            this.saveLists();
        }
    }
    
    saveLists() {
        try {
            localStorage.setItem('ip-lists', JSON.stringify({
                whitelist: this.whitelist,
                blacklist: this.blacklist
            }));
        } catch (e) {
            console.warn('Failed to save IP lists:', e);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.ipWhitelistBlacklist = new IPWhitelistBlacklist(); });
} else {
    window.ipWhitelistBlacklist = new IPWhitelistBlacklist();
}


