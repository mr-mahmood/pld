
export const base64ToFormData = (
    base64: string,
    formName: string,
    fileName: string = 'image.jpg',
    mimeType: string = 'image/jpeg'
): FormData => {
    const formData = new FormData();
    const byteString = atob(base64.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append(formName, blob, fileName);
    return formData;
};

export const base64ToBlob = (
    base64: string,
    fileName: string = 'image.jpg',
    mimeType: string = 'image/jpeg'
): Blob => {
    const byteString = atob(base64.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: mimeType });
    return blob;
};