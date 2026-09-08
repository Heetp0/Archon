const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('src');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    const specificRules = [
        { from: 'bg-[#020617]', to: 'bg-app-bg' },
        { from: 'scrollbarColor: "#1e2030 transparent"', to: 'scrollbarColor: "var(--color-border-core) transparent"' },
        { from: 'scrollbarColor: "#1a3a1a transparent"', to: 'scrollbarColor: "var(--color-border-core) transparent"' },
        { from: 'scrollbarColor: "#1a1b26 transparent"', to: 'scrollbarColor: "var(--color-border-core) transparent"' },
        { from: 'bg-[#01040A]', to: 'bg-app-bg' },
        { from: 'bg-[#050E05]', to: 'bg-panel-bg' },
        { from: 'bg-[#020A02]', to: 'bg-panel-bg' },
        { from: 'bg-[#0A0000]', to: 'bg-panel-bg' },
        { from: 'bg-[#030712]', to: 'bg-app-bg' },
        { from: 'from-[#020817] via-[#020817]', to: 'from-app-bg via-app-bg' },
        { from: 'bg-[#020611]/60', to: 'bg-panel-bg/60' },
        { from: 'bg-[#020611]', to: 'bg-app-bg' },
        { from: 'via-[#020611]', to: 'via-app-bg' },
        { from: 'fill="#0f1017"', to: 'fill="var(--color-app-bg)"' },
        { from: 'fill="#e2e8f0"', to: 'fill="var(--color-text-primary)"' },
        { from: 'fill="#475569"', to: 'fill="var(--color-text-secondary)"' },
        { from: 'bg-[#05050A]', to: 'bg-app-bg' },
        { from: 'bg-[#050505]', to: 'bg-panel-bg' },
        { from: 'text-[#020611]', to: 'text-app-bg' }
    ];
    
    specificRules.forEach(rule => {
        if (content.includes(rule.from)) {
            content = content.split(rule.from).join(rule.to);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
}
