const TARGET_HASH = "6207e2584e17effcc3137290e0317cdd7d507201c138359d347cd2f29e1dd160";

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const password = document.getElementById('admin-password').value;
    const hash = await sha256(password);
    
    if (hash === TARGET_HASH) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

document.getElementById('add-category-btn').addEventListener('click', () => {
    const container = document.getElementById('category-inputs');
    const inputCount = container.querySelectorAll('.v-category').length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'v-category';
    input.placeholder = `Category ${inputCount}`;
    input.style.marginTop = '8px';
    container.appendChild(input);
});


document.getElementById('generate-btn').addEventListener('click', async () => {
    const title = document.getElementById('v-title').value;
    const videoCode = document.getElementById('v-code').value;
    const embed = document.getElementById('v-embed').value;
    const thumbnail = document.getElementById('v-thumbnail').value;
    
    const categoryInputs = document.querySelectorAll('.v-category');
    const categories = Array.from(categoryInputs).map(input => input.value.trim()).filter(c => c);
    
    const actorsStr = document.getElementById('v-actors').value;
    const desc = document.getElementById('v-desc').value;
    const credits = document.getElementById('v-credits').value;
    let date = document.getElementById('v-date').value;
    let duration = document.getElementById('v-duration').value;

    const actors = actorsStr.split(',').map(a => a.trim()).filter(a => a);
    const id = 'video' + Math.random().toString(36).substring(2, 9);
    
    const videoObj = {
        id,
        videoCode,
        title,
        embedUrl: embed,
        category: categories,
        actors,
        description: desc,
        credits,
        publishDate: date,
        duration: duration || "00:00",
        thumbnail
    };

    document.getElementById('json-output').value = JSON.stringify(videoObj, null, 2);
});
