
/**
 * Simple utility to "encrypt" IDs for URL usage (Obfuscation via Base64)
 */

export const encryptId = (id) => {
    if (!id) return btoa(btoa(btoa('admin')));
    const str = String(id);
    return btoa(btoa(btoa(str)));
};

export const decryptId = (encoded) => {
    try {
        return atob(atob(atob(encoded)));
    } catch (e) {
        console.error("Failed to decrypt ID:", e);
        return null;
    }
};
