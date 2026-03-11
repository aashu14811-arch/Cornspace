function embedToLbryUrl(embedUrl) {
    const path = embedUrl.split('/$/embed/')[1].split('?')[0];
    return 'lbry://' + path.replace(/:/g, '#');
}
console.log(embedToLbryUrl("https://odysee.com/$/embed/@ClownfishTV:b/dave-filoni-promises-'new-era'-for:4?r=BRkEuwt1ArBriB7UfFUdfuSXKT215rtb"));
