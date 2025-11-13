# Media Module

## Overview

Module for managing media files (images, videos, documents) in the multi-tenant CMS.

## Features

- ✅ Upload media files (images, videos, documents)
- ✅ List media files with pagination and filtering
- ✅ Get single media file by ID
- ✅ Update media file metadata (filename, alt, metadata)
- ✅ Delete media files
- ✅ Tenant-scoped media files
- ✅ Role-based access control

## API Endpoints

### POST /api/v1/media
Upload a media file.

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-ID: <tenant-id>` (if not in token)
- `Content-Type: multipart/form-data`

**Body:**
- `file`: File to upload (multipart/form-data)
- `filename`: Optional custom filename
- `mimeType`: Optional MIME type
- `size`: Optional file size
- `width`: Optional width (for images)
- `height`: Optional height (for images)
- `alt`: Optional alt text (for images)
- `metadata`: Optional metadata (JSON)

**Response:**
```json
{
  "id": "media-id",
  "tenantId": "tenant-id",
  "filename": "image.jpg",
  "url": "https://cdn.example.com/media/tenant-id/image.jpg",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "width": 1920,
  "height": 1080,
  "alt": "Image description",
  "metadata": {},
  "uploadedById": "user-id",
  "createdAt": "2024-01-09T12:00:00Z",
  "updatedAt": "2024-01-09T12:00:00Z"
}
```

**Required Roles:** Editor, Tenant Admin, Super Admin

### GET /api/v1/media
List all media files with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)
- `mimeType`: Filter by MIME type (optional)
- `search`: Search by filename or alt text (optional)
- `sortBy`: Sort field (createdAt, size, filename) (default: createdAt)
- `sortOrder`: Sort order (asc, desc) (default: desc)

**Response:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Required Roles:** Viewer, Editor, Tenant Admin, Super Admin

### GET /api/v1/media/:id
Get a single media file by ID.

**Response:**
```json
{
  "id": "media-id",
  "tenantId": "tenant-id",
  "filename": "image.jpg",
  "url": "https://cdn.example.com/media/tenant-id/image.jpg",
  ...
}
```

**Required Roles:** Viewer, Editor, Tenant Admin, Super Admin

### PUT /api/v1/media/:id
Update a media file.

**Body:**
- `filename`: Optional new filename
- `alt`: Optional new alt text
- `metadata`: Optional new metadata (JSON)

**Response:**
```json
{
  "id": "media-id",
  "filename": "new-filename.jpg",
  "alt": "New alt text",
  ...
}
```

**Required Roles:** Editor, Tenant Admin, Super Admin

### DELETE /api/v1/media/:id
Delete a media file.

**Response:**
```json
{
  "success": true,
  "deleted": {
    "id": "media-id",
    ...
  }
}
```

**Required Roles:** Tenant Admin, Super Admin

## File Validation

### Allowed MIME Types
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Videos: `video/mp4`, `video/webm`, `video/ogg`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

### File Size Limit
- Maximum: 50MB

## Future Enhancements

- [ ] S3/CDN integration for actual file storage
- [ ] Automatic thumbnail generation
- [ ] Image optimization
- [ ] Progress tracking for large file uploads
- [ ] Tags and categories
- [ ] Advanced search
- [ ] Batch operations

## Notes

- For MVP, files are stored with placeholder URLs
- In production, files should be uploaded to S3/CDN
- Media files are tenant-scoped (isolated per tenant)
- Role-based access control is enforced

