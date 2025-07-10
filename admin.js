// Firebase Config and Init
const firebaseConfig = {
  apiKey: "AIzaSyDXXX-LMkY4Q0oN0M9e5wLdVhANzL8ifHs",
  authDomain: "fchanley-8d910.firebaseapp.com",
  databaseURL: "https://fchanley-8d910-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fchanley-8d910",
  storageBucket: "fchanley-8d910.appspot.com",
  messagingSenderId: "384977183977",
  appId: "1:384977183977:web:7805c8ba7e9122b883bc78",
  measurementId: "G-1CBV4NK83L"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Redirect to login if not authenticated
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  }
});

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const photoUpload = document.getElementById('photoUpload');
  const preview = document.getElementById('preview');
  const galleryUpload = document.getElementById('galleryUpload');
  const galleryContainer = document.getElementById('galleryImages');
  const pageSelector = document.getElementById("pageSelector");
  const newsSection = document.getElementById("newsSection");

  // Preview single image
  photoUpload?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
    }
  });

  // Save content
  document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const selectedPage = pageSelector.value;
    const text = document.getElementById('announcement').value;
    const file = photoUpload?.files[0];

    try {
      let imageUrl = null;

      if (file) {
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`adminContent/${selectedPage}/${file.name}`);
        await imageRef.put(file);
        imageUrl = await imageRef.getDownloadURL();
      }

      await firebase.database().ref(`adminContent/${selectedPage}`).set({
        textContent: text,
        imageUrl: imageUrl || null,
        updatedAt: Date.now()
      });

      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content, check console for details.');
    }
  });

  // Delete buttons
  document.getElementById('deleteTextBtn')?.addEventListener('click', () => {
    alert('Delete text from Firestore for selected page');
    // TODO: implement deletion
  });

  document.getElementById('deleteImageBtn')?.addEventListener('click', () => {
    alert('Delete image from Storage and Firestore');
    // TODO: implement deletion
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
      window.location.href = 'login.html';
    });
  });

  // Load existing content
  function loadExistingContent(page) {
    const dummyText = `Current text for ${page}`;
    const dummyImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png';

    document.getElementById('displayText').textContent = dummyText;
    document.getElementById('displayImage').src = dummyImageUrl;
    document.getElementById('existingContent').classList.remove('hidden');
    document.getElementById('currentText').classList.remove('hidden');
    document.getElementById('currentImage').classList.remove('hidden');
  }

  function loadGalleryImages(page) {
    galleryContainer.innerHTML = '';

    if (page !== 'gallery') {
      galleryContainer.innerHTML =
        "<p class='text-gray-500'>Gallery mode only for 'Gallery' page.</p>";
      return;
    }

    const dummyGallery = [
      { url: 'https://via.placeholder.com/200', name: 'photo1.jpg' },
      { url: 'https://via.placeholder.com/201', name: 'photo2.jpg' }
    ];

    dummyGallery.forEach((img, index) => {
      const div = document.createElement('div');
      div.className = 'relative group';

      div.innerHTML = `
        <img src="${img.url}" alt="Gallery Image ${index + 1}" class="rounded-lg shadow hover:opacity-70 transition" />
        <button class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs hidden group-hover:block" data-index="${index}">×</button>
      `;

      galleryContainer.appendChild(div);
    });
  }

  // Page selector change
  pageSelector?.addEventListener('change', (e) => {
    const page = e.target.value;
    loadExistingContent(page);
    loadGalleryImages(page);

    newsSection?.classList.toggle("hidden", page !== "news");
  });

  // Initial content load
  if (pageSelector) {
    loadExistingContent(pageSelector.value);
    if (pageSelector.value === 'gallery') loadGalleryImages('gallery');
    newsSection?.classList.toggle("hidden", pageSelector.value !== "news");
  }
});

const newsImageInput = document.getElementById('newsImage');
const newsTitleInput = document.getElementById('newsTitle');
const newsBodyInput = document.getElementById('newsBody');
const saveNewsBtn = document.getElementById('saveNewsBtn');

saveNewsBtn.addEventListener('click', async () => {
  const title = newsTitleInput.value.trim();
  const body = newsBodyInput.value.trim();
  const imageFile = newsImageInput.files[0];

  if (!title || !body) {
    alert("Please enter both a title and body.");
    return;
  }

  try {
    let imageUrl = null;

    // Upload image if provided
    if (imageFile) {
      const storageRef = firebase.storage().ref();
      const imageRef = storageRef.child(`newsImages/${Date.now()}_${imageFile.name}`);
      await imageRef.put(imageFile);
      imageUrl = await imageRef.getDownloadURL();
    }

    // Save post to Realtime Database
    const postRef = firebase.database().ref('adminContent/newsPosts').push();
    await postRef.set({
      title,
      body,
      imageUrl: imageUrl || null,
      timestamp: Date.now()
    });

    alert("News post saved!");

    // Clear form
    newsTitleInput.value = '';
    newsBodyInput.value = '';
    newsImageInput.value = '';
    document.getElementById('newsPreview').classList.add('hidden');
    document.getElementById('newsPreview').src = '';

    // Reload posts (we’ll write this function next)
    loadNewsPosts();

  } catch (error) {
    console.error("Error saving news post:", error);
    alert("Failed to save news. Check the console.");
  }
});

newsImageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('newsPreview');
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
});
