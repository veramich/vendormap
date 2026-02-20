import express from "express";
import pool from "./db.js";
import admin from 'firebase-admin';

const router = express.Router();
const REVIEW_FALLBACK_ERROR = 'Please reword your review. Something seems to be giving an error.';

router.get("/locations", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.id AS location_id,
        l.latitude,
        l.longitude,
        l.location_name,
        l.cross_street_1,
        l.cross_street_2,
        l.city,
        l.state,
        l.zip_code,
        l.phone,
        b.id AS business_id,
        b.name AS business_name,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM vendormap.business_locations l
      JOIN vendormap.businesses b
        ON b.id = l.business_id
      LEFT JOIN vendormap.categories c
        ON c.id = b.category_id
      WHERE l.is_active = true
        AND b.is_active = true
        AND l.latitude IS NOT NULL
        AND l.longitude IS NOT NULL
      ORDER BY b.name
    `);

    console.log(`Found ${result.rows.length} locations`);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/locations error:", err);
    res.status(500).json({ error: "Failed to load map locations" });
  }
});
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, slug, icon, color FROM vendormap.categories ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

router.get("/businesses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.logo_url,
        b.keywords,
        c.name AS category_name,
        COALESCE(
          ARRAY_REMOVE(
            ARRAY_AGG(
              DISTINCT COALESCE(lp.thumbnail_url, lp.photo_url)
            ) FILTER (WHERE COALESCE(lp.thumbnail_url, lp.photo_url) IS NOT NULL),
            NULL
          ),
          ARRAY[]::text[]
        ) AS photo_urls
      FROM vendormap.businesses b
      LEFT JOIN vendormap.categories c
        ON c.id = b.category_id
      LEFT JOIN vendormap.business_locations bl
        ON bl.business_id = b.id
        AND bl.is_active = true
      LEFT JOIN vendormap.location_photos lp
        ON lp.location_id = bl.id
      WHERE b.is_active = true
      GROUP BY b.id, b.name, b.logo_url, b.keywords, c.name
      ORDER BY b.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        SELECT
          b.id AS business_id,
          b.name AS business_name,
          b.description,
          b.website,
          b.social_media,
          b.logo_url,
          b.keywords,
          b.is_chain,
          b.parent_company,
          b.if_verified,
          b.created_at,
          b.updated_at,
          c.id AS category_id,
          c.name AS category_name,
          c.slug AS category_slug,
          c.icon AS category_icon,
          c.color AS category_color,
          bl.id AS location_id,
          bl.location_name,
          bl.is_primary,
          bl.phone,
          bl.local_email,
          bl.cross_street_1,
          bl.cross_street_2,
          bl.city,
          bl.state,
          bl.country,
          bl.zip_code,
          bl.neighborhood,
          bl.business_hours,
          bl.notes,
          bl.amenities,
          bl.latitude,
          bl.longitude,
          bl.temporarily_closed,
          bl.closed_reason,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', lp.id,
                'photo_url', lp.photo_url,
                'thumbnail_url', lp.thumbnail_url,
                'caption', lp.caption,
                'display_order', lp.display_order,
                'is_primary', lp.is_primary
              )
              ORDER BY lp.is_primary DESC, lp.display_order ASC, lp.created_at ASC
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS photos
        FROM vendormap.business_locations bl
        JOIN vendormap.businesses b
          ON b.id = bl.business_id
          AND b.is_active = true
        LEFT JOIN vendormap.categories c
          ON c.id = b.category_id
        LEFT JOIN vendormap.location_photos lp
          ON lp.location_id = bl.id
        WHERE bl.id = $1
          AND bl.is_active = true
        GROUP BY b.id, c.id, bl.id
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const row = result.rows[0];

    res.json({
      id: row.business_id,
      name: row.business_name,
      description: row.description,
      website: row.website,
      social_media: row.social_media,
      logo_url: row.logo_url,
      keywords: row.keywords,
      is_chain: row.is_chain,
      parent_company: row.parent_company,
      if_verified: row.if_verified,
      category_id: row.category_id,
      category_name: row.category_name,
      category_slug: row.category_slug,
      category_icon: row.category_icon,
      category_color: row.category_color,
      created_at: row.created_at,
      updated_at: row.updated_at,
      locations: [
        {
          location_id: row.location_id,
          location_name: row.location_name,
          is_primary: row.is_primary,
          phone: row.phone,
          local_email: row.local_email,
          cross_street_1: row.cross_street_1,
          cross_street_2: row.cross_street_2,
          city: row.city,
          state: row.state,
          country: row.country,
          zip_code: row.zip_code,
          neighborhood: row.neighborhood,
          business_hours: row.business_hours,
          notes: row.notes,
          amenities: row.amenities,
          latitude: row.latitude,
          longitude: row.longitude,
          temporarily_closed: row.temporarily_closed,
          closed_reason: row.closed_reason,
          photos: row.photos,
        },
      ],
    });
  } catch (err) {
    console.error('Error fetching location details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const businessResult = await pool.query(
      `
        SELECT
          b.id,
          b.name,
          b.description,
          b.website,
          b.social_media,
          b.logo_url,
          b.keywords,
          b.is_chain,
          b.parent_company,
          b.if_verified,
          b.created_at,
          b.updated_at,
          c.id AS category_id,
          c.name AS category_name,
          c.slug AS category_slug,
          c.icon AS category_icon,
          c.color AS category_color
        FROM vendormap.businesses b
        LEFT JOIN vendormap.categories c
          ON c.id = b.category_id
        WHERE b.id = $1
          AND b.is_active = true
        LIMIT 1
      `,
      [id]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const locationsResult = await pool.query(
      `
        SELECT
          bl.id AS location_id,
          bl.location_name,
          bl.is_primary,
          bl.phone,
          bl.local_email,
          bl.cross_street_1,
          bl.cross_street_2,
          bl.city,
          bl.state,
          bl.country,
          bl.zip_code,
          bl.neighborhood,
          bl.business_hours,
          bl.notes,
          bl.amenities,
          bl.latitude,
          bl.longitude,
          bl.temporarily_closed,
          bl.closed_reason,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', lp.id,
                'photo_url', lp.photo_url,
                'thumbnail_url', lp.thumbnail_url,
                'caption', lp.caption,
                'display_order', lp.display_order,
                'is_primary', lp.is_primary
              )
              ORDER BY lp.is_primary DESC, lp.display_order ASC, lp.created_at ASC
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS photos
        FROM vendormap.business_locations bl
        LEFT JOIN vendormap.location_photos lp
          ON lp.location_id = bl.id
        WHERE bl.business_id = $1
          AND bl.is_active = true
        GROUP BY bl.id
        ORDER BY bl.is_primary DESC, bl.created_at ASC
      `,
      [id]
    );

    res.json({
      ...businessResult.rows[0],
      locations: locationsResult.rows,
    });
  } catch (err) {
    console.error('Error fetching business details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/locations/:locationId/reviews', async (req, res) => {
  try {
    const { locationId } = req.params;

    const reviewsResult = await pool.query(
      `
        SELECT
          r.id,
          r.rating,
          r.title,
          r.review_text,
          COALESCE(r.helpful_count, 0) AS helpful_count,
          r.created_at,
          r.updated_at
          ,u.username,
          u.firebase_uid,
          u.full_name,
          (r.updated_at IS NOT NULL AND r.updated_at > r.created_at) AS was_edited
        FROM vendormap.reviews r
        LEFT JOIN vendormap.users u
          ON u.id = r.user_id
        WHERE r.location_id = $1
        ORDER BY r.created_at DESC
      `,
      [locationId]
    );

    const summaryResult = await pool.query(
      `
        SELECT
          COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS avg_rating,
          COUNT(*)::int AS review_count
        FROM vendormap.reviews r
        WHERE r.location_id = $1
      `,
      [locationId]
    );

    res.json({
      reviews: reviewsResult.rows,
      avg_rating: Number(summaryResult.rows[0]?.avg_rating ?? 0),
      review_count: Number(summaryResult.rows[0]?.review_count ?? 0),
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: REVIEW_FALLBACK_ERROR });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      `
        SELECT id, username, full_name, email, firebase_uid, created_at, updated_at
        FROM vendormap.users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/businesses', async (req, res) => {
  try {
    const { authtoken } = req.headers;
    if (!authtoken) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    let user;
    try {
      user = await admin.auth().verifyIdToken(authtoken);
    } catch (authError) {
      console.error('Firebase auth error:', authError);
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        details: authError.message 
      });
    }

    const businessData = JSON.parse(req.body.business);
    const {
      name,
      category_id,
      description,
      website,
      email,
      keywords,
      amenities,
      is_chain,
      is_owner,
      locations
    } = businessData;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!locations || locations.length === 0) {
      return res.status(400).json({ error: 'At least one location is required' });
    }

    for (const location of locations) {
      if (!location.cross_street_1 || !location.cross_street_2 || !location.city || !location.state) {
        return res.status(400).json({ error: 'All location fields (cross streets, city, state) are required' });
      }
      
      const usStates = [
        'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
        'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
        'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
        'TX','UT','VT','VA','WA','WV','WI','WY'
      ];
      
      if (!usStates.includes(location.state)) {
        return res.status(400).json({ error: 'Business must be located in the United States' });
      }
    }

    await pool.query('BEGIN');

    try {
      const businessResult = await pool.query(`
        INSERT INTO vendormap.businesses (
          name, category_id, description, website, email, keywords, 
          amenities, is_chain, is_pending, created_by_user_id, is_owner_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
        RETURNING id
      `, [
        name.trim(),
        parseInt(category_id),
        description?.trim() || null,
        website?.trim() || null,
        email?.trim() || null,
        keywords || [],
        amenities || [],
        is_chain || false,
        user.uid,
        is_owner || false
      ]);

      const businessId = businessResult.rows[0].id;

      for (const location of locations) {
        const locationResult = await pool.query(`
          INSERT INTO vendormap.business_locations (
            business_id, location_name, cross_street_1, cross_street_2,
            city, state, latitude, longitude, phone, location_privacy, 
            business_hours, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
          RETURNING id
        `, [
          businessId,
          location.location_name?.trim() || null,
          location.cross_street_1.trim(),
          location.cross_street_2.trim(),
          location.city.trim(),
          location.state,
          location.latitude,
          location.longitude,
          location.phone?.trim() || null,
          location.location_privacy || 'intersection',
          JSON.stringify(location.business_hours),
        ]);
      }

      await pool.query('COMMIT');

      res.status(201).json({ 
        message: 'Business submitted successfully and is pending approval',
        businessId: businessId
      });

    } catch (insertError) {
      await pool.query('ROLLBACK');
      throw insertError;
    }

  } catch (err) {
    console.error('Error creating business:', err);
    res.status(500).json({ error: 'Failed to submit business' });
  }
});

router.use(async (req, res, next) => {
  const { authtoken } = req.headers;
  if (authtoken) {
    try {
      const user = await admin.auth().verifyIdToken(authtoken);
      req.user = user;
      next();
    } catch (authError) {
      console.error('Firebase auth error:', authError);
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        details: authError.message 
      });
    }
  } else {
    res.status(401).json({ error: 'Authentication token required' });
  }
})

router.post('/locations/:locationId/reviews', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { rating, title, review_text } = req.body;

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Please select your star rating' });
    }

    if (typeof review_text !== 'string' || !review_text.trim()) {
      return res.status(400).json({ error: 'Please add a comment to submit your review' });
    }

    const trimmedReviewText = review_text.trim();
    if (trimmedReviewText.length < 10) {
      return res.status(400).json({
        error: 'Review text must be at least 10 characters long'
      });
    }

    const locationCheck = await pool.query(
      `
        SELECT id
        FROM vendormap.business_locations
        WHERE id = $1
          AND is_active = true
        LIMIT 1
      `,
      [locationId]
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const firebaseUid = req.user?.uid;
    const firebaseEmail = req.user?.email;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Invalid authentication: user ID not found' });
    }

    let userResult = await pool.query(
      `
        SELECT id, is_active
        FROM vendormap.users
        WHERE firebase_uid = $1
        LIMIT 1
      `,
      [firebaseUid]
    );

    let resolvedUserId = null;

    if (userResult.rows.length > 0) {
      const foundUser = userResult.rows[0];
      if (foundUser.is_active === false) {
        const activateResult = await pool.query(
          `
            UPDATE vendormap.users
            SET is_active = true, updated_at = NOW()
            WHERE id = $1
            RETURNING id
          `,
          [foundUser.id]
        );
        resolvedUserId = activateResult.rows[0]?.id;
      } else {
        resolvedUserId = foundUser.id;
      }
    }

    if (!resolvedUserId && firebaseEmail) {
      const emailResult = await pool.query(
        `
          SELECT id
          FROM vendormap.users
          WHERE email = $1
          LIMIT 1
        `,
        [firebaseEmail]
      );

      if (emailResult.rows.length > 0) {
        const updateResult = await pool.query(
          `
            UPDATE vendormap.users
            SET firebase_uid = $1, is_active = true, updated_at = NOW()
            WHERE id = $2
            RETURNING id
          `,
          [firebaseUid, emailResult.rows[0].id]
        );
        resolvedUserId = updateResult.rows[0]?.id;
      }
    }

    if (!resolvedUserId) {
      let baseUsername = firebaseEmail
        ? firebaseEmail.split('@')[0]
        : `user_${firebaseUid.substring(0, 8)}`;
      baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
      if (!baseUsername) {
        baseUsername = `user_${firebaseUid.substring(0, 8)}`;
      }

      let username = baseUsername;
      let attempts = 0;
      let created = false;

      while (!created && attempts < 10) {
        try {
          const createUserResult = await pool.query(
            `
              INSERT INTO vendormap.users (firebase_uid, email, username, is_active, created_at)
              VALUES ($1, $2, $3, true, NOW())
              ON CONFLICT (firebase_uid) DO UPDATE
                SET is_active = true,
                    updated_at = NOW()
              RETURNING id
            `,
            [firebaseUid, firebaseEmail || null, username]
          );
          resolvedUserId = createUserResult.rows[0]?.id;
          created = true;
        } catch (createErr) {
          if (
            createErr.constraint === 'users_username_key' ||
            (createErr.code === '23505' && createErr.message?.includes('username'))
          ) {
            attempts += 1;
            username = `${baseUsername}${attempts}`;
            continue;
          }

          if (
            createErr.constraint === 'users_firebase_uid_key' ||
            (createErr.code === '23505' && createErr.message?.includes('firebase_uid'))
          ) {
            const existingUser = await pool.query(
              `
                SELECT id
                FROM vendormap.users
                WHERE firebase_uid = $1
                LIMIT 1
              `,
              [firebaseUid]
            );
            if (existingUser.rows.length > 0) {
              resolvedUserId = existingUser.rows[0].id;
              created = true;
            }
          }

          break;
        }
      }
    }

    if (!resolvedUserId) {
      return res.status(400).json({
        error: 'User account not found. Could not create user account.',
      });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO vendormap.reviews (
          location_id,
          user_id,
          rating,
          title,
          review_text,
          helpful_count
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, location_id, user_id, rating, title, review_text, helpful_count, created_at, updated_at
      `,
      [
        locationId,
        resolvedUserId,
        numericRating,
        typeof title === 'string' && title.trim() ? title.trim() : null,
        trimmedReviewText,
        0,
      ]
    );

    const insertedReview = insertResult.rows[0];

    userResult = await pool.query(
      `
        SELECT username, full_name, firebase_uid
        FROM vendormap.users
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedUserId]
    );

    res.status(201).json({
      ...insertedReview,
      username: userResult.rows[0]?.username ?? 'Unknown',
      firebase_uid: userResult.rows[0]?.firebase_uid ?? null,
      full_name: userResult.rows[0]?.full_name ?? null,
      was_edited: false,
    });
  } catch (err) {
    console.error('Error creating review:', err);
    if (err?.code === '23505' && err?.constraint === 'reviews_location_id_user_id_key') {
      return res.status(409).json({
        error: 'You have already reviewed this location. You can edit your existing review instead of posting another one.'
      });
    }
    if (err.message && err.message.includes('pattern')) {
      return res.status(400).json({
        error: err.message,
        details: 'The review text does not match the required pattern. Please check the database constraints.'
      });
    }
    res.status(500).json({ error: REVIEW_FALLBACK_ERROR });
  }
});

router.patch('/locations/:locationId/reviews/:reviewId', async (req, res) => {
  try {
    const { locationId, reviewId } = req.params;
    const { rating, title, review_text } = req.body;

    if (rating === undefined && title === undefined && review_text === undefined) {
      return res.status(400).json({
        error: 'Please provide at least one field to update: rating, title, or review_text.'
      });
    }

    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Invalid authentication: user ID not found' });
    }

    const userResult = await pool.query(
      `
        SELECT id, is_active
        FROM vendormap.users
        WHERE firebase_uid = $1
        LIMIT 1
      `,
      [firebaseUid]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].is_active === false) {
      return res.status(401).json({ error: 'User account not found or inactive' });
    }

    const resolvedUserId = userResult.rows[0].id;

    const existingReviewResult = await pool.query(
      `
        SELECT id, user_id
        FROM vendormap.reviews
        WHERE id = $1
          AND location_id = $2
        LIMIT 1
      `,
      [reviewId, locationId]
    );

    if (existingReviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found for this location' });
    }

    if (existingReviewResult.rows[0].user_id !== resolvedUserId) {
      return res.status(403).json({ error: 'You can only edit your own review' });
    }

    const setClauses = [];
    const values = [];

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: 'Please select a valid star rating (1-5)' });
      }
      values.push(numericRating);
      setClauses.push(`rating = $${values.length}`);
    }

    if (title !== undefined) {
      if (title !== null && typeof title !== 'string') {
        return res.status(400).json({ error: 'Title must be a string or null' });
      }

      const normalizedTitle = typeof title === 'string' && title.trim() ? title.trim() : null;
      values.push(normalizedTitle);
      setClauses.push(`title = $${values.length}`);
    }

    if (review_text !== undefined) {
      if (typeof review_text !== 'string' || !review_text.trim()) {
        return res.status(400).json({ error: 'Please add a comment to update your review' });
      }

      const trimmedReviewText = review_text.trim();
      if (trimmedReviewText.length < 10) {
        return res.status(400).json({ error: 'Review text must be at least 10 characters long' });
      }

      values.push(trimmedReviewText);
      setClauses.push(`review_text = $${values.length}`);
    }

    setClauses.push('updated_at = NOW()');

    values.push(reviewId);
    values.push(locationId);

    const updateResult = await pool.query(
      `
        UPDATE vendormap.reviews
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length - 1}
          AND location_id = $${values.length}
        RETURNING id, location_id, user_id, rating, title, review_text, helpful_count, created_at, updated_at
      `,
      values
    );

    const updatedReview = updateResult.rows[0];

    const reviewUserResult = await pool.query(
      `
        SELECT username, full_name, firebase_uid
        FROM vendormap.users
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedUserId]
    );

    res.json({
      ...updatedReview,
      username: reviewUserResult.rows[0]?.username ?? 'Unknown',
      firebase_uid: reviewUserResult.rows[0]?.firebase_uid ?? null,
      full_name: reviewUserResult.rows[0]?.full_name ?? null,
      was_edited: true,
    });
  } catch (err) {
    console.error('Error editing review:', err);
    if (err?.message && err.message.includes('pattern')) {
      return res.status(400).json({ error: 'Updated review text does not match the required format.' });
    }
    res.status(500).json({ error: REVIEW_FALLBACK_ERROR });
  }
});

router.post('/locations/:locationId/reviews/:reviewId/helpful', async (req, res) => {
  try {
    const { locationId, reviewId } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful must be true or false' });
    }

    const updateResult = await pool.query(
      `
        UPDATE vendormap.reviews r
        SET
          helpful_count = CASE
            WHEN $3::boolean = true THEN COALESCE(r.helpful_count, 0) + 1
            ELSE GREATEST(COALESCE(r.helpful_count, 0) - 1, 0)
          END,
          updated_at = NOW()
        WHERE r.id = $1
          AND r.location_id = $2
        RETURNING r.id, r.location_id, COALESCE(r.helpful_count, 0) AS helpful_count
      `,
      [reviewId, locationId, helpful]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found for this location' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: REVIEW_FALLBACK_ERROR });
  }
});

export default router;