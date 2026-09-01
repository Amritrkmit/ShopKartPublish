import { useEffect, useState } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useCookieConsent } from '../hooks/useCookieConsent';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ScriptLoader = () => {
    const [scripts, setScripts] = useState([]);
    const { preferences } = useCookieConsent();

    useEffect(() => {
        const fetchScripts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/scripts`);
                setScripts(res.data);
            } catch (err) {
                console.error("Failed to load tracking scripts");
            }
        };
        fetchScripts();
    }, []);

    const shouldInject = (script) => {
        if (script.category === 'essential') return true;
        if (script.category === 'analytics') return preferences.analytics;
        if (script.category === 'marketing') return preferences.marketing;
        return false;
    };

    // Filter scripts based on consent
    const activeScripts = scripts.filter(shouldInject);

    // Group by type
    const headScripts = activeScripts.filter(s => s.type === 'HEAD');
    const bodyStartScripts = activeScripts.filter(s => s.type === 'BODY_START');
    const bodyEndScripts = activeScripts.filter(s => s.type === 'BODY_END');

    // Body Scripts Injection Effect
    useEffect(() => {
        const injectBodyScript = (script) => {
            const id = `script-${script.type}-${script.name.replace(/\s+/g, '-')}`;
            if (document.getElementById(id)) return; // Prevent duplicates

            const el = document.createElement('div');
            el.id = id;
            // Create a range to properly parse script tags
            const range = document.createRange();
            const fragment = range.createContextualFragment(script.content);

            if (script.type === 'BODY_START') {
                document.body.prepend(el);
            } else {
                document.body.append(el);
            }
            el.appendChild(fragment);
        };

        // Clean up previous scripts if consent changed (complex to remove generic scripts, 
        // usually we reload page, but for now we just append new ones. 
        // Real-world GTM often requires page reload on consent change for clean state)

        bodyStartScripts.forEach(injectBodyScript);
        bodyEndScripts.forEach(injectBodyScript);

    }, [bodyStartScripts, bodyEndScripts]);

    return (
        <Helmet>
            {headScripts.map((script, idx) => (
                <script key={idx} type="text/javascript">
                    {script.content.replace(/<script>|<\/script>/gi, '')}
                </script>
            ))}
        </Helmet>
    );
};

export default ScriptLoader;
