import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shuffle, Plus, ImageUp, Play, Loader2, Instagram } from 'lucide-react';
import { TEMPLATES, type TemplateId } from '../components/TemplatesModal';
import { supabase } from '../api/supabase';
import type { InstagramAccount } from '../types';

const MAX_MESSAGE_LENGTH = 1000;

type InstagramPost = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export const FlowSetup: React.FC = () => {
  const { templateId, automationId } = useParams<{ templateId?: string; automationId?: string }>();
  const navigate = useNavigate();
  const templateFromNew = templateId ? TEMPLATES.find((t) => t.id === (templateId as TemplateId)) : null;
  const [loadedTemplate, setLoadedTemplate] = useState<typeof TEMPLATES[0] | null>(templateFromNew ?? null);
  const [editId, setEditId] = useState<string | null>(automationId ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const template = loadedTemplate ?? templateFromNew;

  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [postMode, setPostMode] = useState<'specific' | 'next'>('specific');
  const [loadingEdit, setLoadingEdit] = useState(!!automationId);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [anyKeyword, setAnyKeyword] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [message, setMessage] = useState('');
  const [openingMessage, setOpeningMessage] = useState(false);
  const [openingMessageText, setOpeningMessageText] = useState('');
  const [publicReply, setPublicReply] = useState(false);
  const [publicReplyText, setPublicReplyText] = useState('');
  const [askToFollow, setAskToFollow] = useState(false);
  const [askToFollowText, setAskToFollowText] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [messageImageUrl, setMessageImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
  const MAX_IMAGE_MB = 5;

  const templateToTriggerType: Record<string, 'dm' | 'comment' | 'mention' | 'first_interaction'> = {
    comment_to_dm: 'comment',
    story_reply: 'first_interaction',
    ice_breakers: 'dm',
    dm_auto_responder: 'dm',
  };

  const fetchAccounts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAccounts([]);
      setHasAccount(false);
      return;
    }
    let list: InstagramAccount[] = [];
    try {
      const res = await fetch('/api/instagram-accounts', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) list = data;
    } catch {
      /* API not available (e.g. localhost without vercel dev) */
    }
    if (list.length === 0) {
      const { data: supabaseData } = await supabase.from('instagram_accounts').select('*');
      if (supabaseData?.length) list = supabaseData as InstagramAccount[];
    }
    setAccounts(list);
    setHasAccount(list.length > 0);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!selectedAccountId) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPosts([]);
        return;
      }
      const res = await fetch(`/api/instagram-media?accountId=${encodeURIComponent(selectedAccountId)}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.data) ? json.data : [];
      setPosts(list);
      if (!res.ok && json?.error) setPostsError(json.error);
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  // Load existing automation when editing
  useEffect(() => {
    if (!automationId) {
      setLoadingEdit(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadError(null);
      const { data, error } = await supabase
        .from('automations')
        .select('id, name, trigger_type, trigger_keywords, config, instagram_account_id')
        .eq('id', automationId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message ?? 'Automation not found');
        setLoadingEdit(false);
        return;
      }
      setEditId(data.id);
      if (data.instagram_account_id) setSelectedAccountId(data.instagram_account_id);
      const cfg = (data.config as Record<string, unknown>) ?? {};
      const tid = (cfg.templateId as string) ?? 'comment_to_dm';
      setLoadedTemplate(TEMPLATES.find((t) => t.id === (tid as TemplateId)) ?? TEMPLATES[0]);
      setPostMode((cfg.postMode as 'specific' | 'next') ?? 'specific');
      setSelectedPostId((cfg.selectedPostId as string) ?? null);
      const kw = cfg.trigger_keywords ?? data.trigger_keywords ?? [];
      setKeywords(Array.isArray(kw) ? kw : []);
      setAnyKeyword(!Array.isArray(kw) || kw.length === 0);
      setMessage((cfg.message as string) ?? '');
      setOpeningMessage(!!cfg.openingMessage);
      setOpeningMessageText((cfg.openingMessageText as string) ?? '');
      setPublicReply(!!cfg.publicReply);
      setPublicReplyText((cfg.publicReplyText as string) ?? '');
      setAskToFollow(!!cfg.askToFollow);
      setAskToFollowText((cfg.askToFollowText as string) ?? '');
      setFollowUp(!!cfg.followUp);
      setFollowUpMessage((cfg.followUpMessage as string) ?? '');
      setMessageImageUrl(typeof cfg.messageImageUrl === 'string' ? cfg.messageImageUrl : null);
      setLoadingEdit(false);
    })();
    return () => { cancelled = true; };
  }, [automationId]);

  useEffect(() => {
    if (postMode === 'specific' && selectedAccountId) {
      fetchPosts();
    } else if (postMode === 'next') {
      setPosts([]);
      setSelectedPostId(null);
    }
  }, [postMode, selectedAccountId, fetchPosts]);

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (k && !keywords.includes(k)) {
      setKeywords([...keywords, k]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((x) => x !== k));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSaveError('Please choose PNG, JPG, or GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setSaveError(`Image must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setImageUploading(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user?.id ?? 'anon'}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('automation-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('automation-assets').getPublicUrl(data.path);
      setMessageImageUrl(urlData.publicUrl);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Image upload failed. Create a bucket "automation-assets" in Supabase Storage if needed.');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const handleGoLive = async () => {
    if (!template) return;
    setSaveError(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSaveError('Please sign in again.');
        return;
      }
      const instagramAccountId = selectedAccountId || (accounts.length > 0 ? accounts[0].id : null);
      if (!instagramAccountId && !editId) {
        setSaveError('Select an Instagram account above.');
        return;
      }
      const triggerType = templateToTriggerType[template.id] ?? 'comment';
      const name = editId ? undefined : `${template.title} – ${new Date().toLocaleDateString()}`;
      const config = {
        templateId: template.id,
        postMode,
        selectedPostId: postMode === 'specific' ? selectedPostId : null,
        message,
        openingMessage,
        openingMessageText: openingMessageText.trim() || undefined,
        publicReply,
        publicReplyText: publicReplyText.trim() || undefined,
        askToFollow,
        askToFollowText: askToFollowText.trim() || undefined,
        followUp,
        followUpMessage: followUpMessage.trim() || undefined,
        messageImageUrl: messageImageUrl || undefined,
      };
      const payload = {
        ...(editId ? { id: editId } : {}),
        name,
        trigger_type: triggerType,
        trigger_keywords: keywords.length > 0 ? keywords : [],
        is_active: true,
        config,
        ...(instagramAccountId ? { instagram_account_id: instagramAccountId } : {}),
      };
      const res = await fetch('/api/save-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(json?.error ?? 'Failed to save automation.');
        return;
      }
      if (json?.id) navigate('/automations');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="p-8 flex items-center gap-3">
        <Loader2 className="animate-spin" size={24} />
        <span>Loading automation…</span>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/automations')} className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft size={18} /> Back to Automations
        </button>
        <p className="mt-4 text-red-500">{loadError}</p>
      </div>
    );
  }
  if (!template) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/automations')} className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft size={18} /> Back to Automations
        </button>
        <p className="mt-4 text-gray-500">Template not found.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Preview */}
      <div className="flex-1 flex flex-col items-center justify-start pt-8 pb-8 pl-8 pr-4 border-r border-gray-200 dark:border-gray-700 overflow-auto">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 w-full">Preview:</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] p-3 shadow-xl border border-gray-200 dark:border-gray-600">
          <div className="w-[280px] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-400">←</span>
              <span className="font-semibold text-sm">Posts</span>
              <span className="text-gray-400">⋯</span>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-2 pb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                <span className="text-xs font-semibold">@_.pastel_eris</span>
              </div>
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center px-4">You haven&apos;t picked a post yet</p>
              </div>
              <div className="flex gap-6 pt-2 pb-2">
                <span className="text-gray-400">♡</span>
                <span className="text-gray-400">💬</span>
                <span className="text-gray-400">✈</span>
                <span className="text-gray-400">🔖</span>
              </div>
            </div>
            <div className="h-12 flex items-center justify-around border-t border-gray-100 dark:border-gray-800 text-gray-400">
              <span>⌂</span><span>🔍</span><span>+</span><span>▶</span><span>👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Setup panel */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-6">
        <button
          onClick={() => navigate('/automations')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm mb-6"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Setup {template.title}</h1>

        {/* 1 Choose Instagram account (must be the account that owns the post — webhooks use this) */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">1 Choose Instagram account</h2>
          {accounts.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
              Connect an account first from <button type="button" onClick={() => navigate('/connect')} className="underline font-medium">Connect</button>.
            </p>
          )}
          {accounts.length > 0 && (
            <div className="space-y-2">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'}`}
                  >
                    {acc.profile_picture ? (
                      <img src={acc.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <Instagram size={20} className="text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white truncate">{acc.account_name || 'Instagram account'}</span>
                    <span className="text-xs text-gray-500 truncate">ID: {acc.instagram_business_id}</span>
                    {isSelected && <span className="ml-auto text-blue-600 dark:text-blue-400 text-xs font-medium">Selected</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 2 Select a Post */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">2 Select a Post</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="postMode" checked={postMode === 'specific'} onChange={() => setPostMode('specific')} className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium">Specific Post</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">Select from existing posts</p>
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <input type="radio" name="postMode" checked={postMode === 'next'} onChange={() => setPostMode('next')} className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium">Next Post</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">Activate on your next post</p>
          </div>
          {postMode === 'specific' && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose a Post:</p>
              {hasAccount === false && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">Connect an Instagram account first from Connect.</p>
              )}
              {hasAccount === true && !selectedAccountId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Select an Instagram account above.</p>
              )}
              {hasAccount === true && selectedAccountId && postsLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4">
                  <Loader2 size={18} className="animate-spin" /> Loading posts…
                </div>
              )}
              {hasAccount === true && selectedAccountId && !postsLoading && postsError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{postsError}</p>
              )}
              {hasAccount === true && selectedAccountId && !postsLoading && !postsError && posts.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No posts found. Post something on Instagram and try again.</p>
              )}
              {hasAccount === true && selectedAccountId && !postsLoading && posts.length > 0 && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {posts.map((post) => {
                      const thumb = post.thumbnail_url || post.media_url;
                      const isSelected = selectedPostId === post.id;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelectedPostId(isSelected ? null : post.id)}
                          className={`w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">Media</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={fetchPosts} className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">Refresh posts</button>
                </>
              )}
            </div>
          )}
        </section>

        {/* 3 Add Keywords */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">3 Add Keywords</h2>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Any keyword</span>
            <button type="button" role="switch" aria-checked={anyKeyword} onClick={() => setAnyKeyword(!anyKeyword)} className={`w-10 h-6 rounded-full transition-colors ${anyKeyword ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${anyKeyword ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type keyword..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button type="button" onClick={addKeyword} className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50">
              <Plus size={18} />
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                  {k}
                  <button type="button" onClick={() => removeKeyword(k)} className="text-gray-500 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 4 Send DM Message */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">4 Send DM Message</h2>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button type="button" className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Shuffle size={14} /> Shuffle
              </button>
            </div>
            <textarea
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              rows={5}
              className="w-full px-3 py-3 pr-24 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{message.length}/{MAX_MESSAGE_LENGTH}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Plus size={16} /> Add Link
            </button>
          </div>
          <label className="mt-3 block border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
            <input type="file" accept=".png,.jpg,.jpeg,.gif,image/png,image/jpeg,image/gif" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
            {messageImageUrl ? (
              <div className="relative inline-block">
                <img src={messageImageUrl} alt="Uploaded" className="max-h-24 rounded-lg object-cover mx-auto" />
                <button type="button" onClick={() => setMessageImageUrl(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600">×</button>
              </div>
            ) : (
              <>
                {imageUploading ? <Loader2 className="mx-auto mb-2 animate-spin text-blue-500" size={28} /> : <ImageUp className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={28} />}
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Upload Image</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              </>
            )}
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Private replies are text-only; image is saved for your reference.</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">Opening message</span>
            <button type="button" role="switch" aria-checked={openingMessage} onClick={() => setOpeningMessage(!openingMessage)} className={`w-10 h-6 rounded-full transition-colors ${openingMessage ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${openingMessage ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {openingMessage && (
            <input
              type="text"
              placeholder="e.g. Hi! Thanks for commenting."
              value={openingMessageText}
              onChange={(e) => setOpeningMessageText(e.target.value.slice(0, 200))}
              className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm"
            />
          )}
        </section>

        {/* 5 Advanced Automations */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">5 Advanced Automations</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Smart engagement automations</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Publicly reply to comments</span>
                <button type="button" role="switch" aria-checked={publicReply} onClick={() => setPublicReply(!publicReply)} className={`w-10 h-6 rounded-full transition-colors ${publicReply ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${publicReply ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {publicReply && (
                <input type="text" placeholder="e.g. Thanks! Check your DMs 👋" value={publicReplyText} onChange={(e) => setPublicReplyText(e.target.value.slice(0, 200))} className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Ask to follow before sending DM</span>
                <button type="button" role="switch" aria-checked={askToFollow} onClick={() => setAskToFollow(!askToFollow)} className={`w-10 h-6 rounded-full transition-colors ${askToFollow ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${askToFollow ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {askToFollow && (
                <input type="text" placeholder="e.g. Follow us for more!" value={askToFollowText} onChange={(e) => setAskToFollowText(e.target.value.slice(0, 200))} className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Send follow-up message</span>
                <button type="button" role="switch" aria-checked={followUp} onClick={() => setFollowUp(!followUp)} className={`w-10 h-6 rounded-full transition-colors ${followUp ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${followUp ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {followUp && (
                <textarea placeholder="Follow-up message (sent right after the main DM)" value={followUpMessage} onChange={(e) => setFollowUpMessage(e.target.value.slice(0, 500))} rows={2} className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm resize-none" />
              )}
            </div>
          </div>
        </section>

        {saveError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{saveError}</p>
        )}
        <button
          onClick={handleGoLive}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-green-500/20 transition-all"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
          {saving ? ' Saving…' : ' GO LIVE'}
        </button>
      </div>
    </div>
  );
};
